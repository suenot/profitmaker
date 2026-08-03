import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  OrderFormData,
  PlaceOrderRequest,
  PlaceOrderResponse,
  OrderValidationError,
  OrderEstimate,
  OrderSide,
  AdvancedOrderOptions,
  OrderValidationRules,
  MarketConstraints
} from '../types/orders';
import { roundToStep, safeStep, notionalValue, generateClientOrderId } from '../utils/orderMath';

/**
 * Balances needed to validate BOTH sides of an order. A buy spends quote
 * (e.g. USDT), a sell spends base (e.g. BTC) — checking a sell against the
 * quote balance blocks sells you can cover and admits sells you cannot.
 */
export interface OrderBalances {
  /** Quote-currency available: the spend budget for a BUY. */
  available: number;
  /** Quote currency code (e.g. "USDT"). */
  currency: string;
  /** Base-currency available: the sellable holding for a SELL. */
  baseAvailable?: number;
  /** Base currency code (e.g. "BTC"). */
  baseCurrency?: string;
}

/**
 * TODO(types): `src/types/orders.ts` and `packages/types/src/orders.ts` are
 * duplicate, already-diverged copies of this contract. These two extensions
 * should be folded into the shared package once those are merged.
 */
export interface ExtendedOrderValidationRules extends Omit<OrderValidationRules, 'balance'> {
  balance: OrderBalances;
}

export interface OrderSubmitResponse extends PlaceOrderResponse {
  /**
   * Non-fatal problems that occurred after the entry order was accepted —
   * most importantly an attached stop-loss that failed to place. The entry
   * succeeded, so this is not an error, but it must never be silent.
   */
  warnings?: string[];
}

interface PlaceOrderWidgetState {
  // Basic order form state
  formData: OrderFormData;

  // Widget settings
  selectedGroupId: string | null;
  isAdvancedMode: boolean;

  // Order validation and estimates
  validationErrors: OrderValidationError[];
  orderEstimate: OrderEstimate | null;
  validationRules: ExtendedOrderValidationRules | null;

  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  lastOrderResponse: OrderSubmitResponse | null;

  // Advanced options
  advancedOptions: AdvancedOrderOptions;
}

interface PlaceOrderWidgetsStore {
  widgets: Record<string, PlaceOrderWidgetState>;
  
  // Widget management
  getWidget: (widgetId: string) => PlaceOrderWidgetState;
  initializeWidget: (widgetId: string, groupId?: string) => void;
  removeWidget: (widgetId: string) => void;
  
  // Form data management
  updateFormData: (widgetId: string, updates: Partial<OrderFormData>) => void;
  resetForm: (widgetId: string) => void;
  
  // Advanced options
  toggleAdvancedMode: (widgetId: string) => void;
  updateAdvancedOptions: (widgetId: string, options: Partial<AdvancedOrderOptions>) => void;
  
  // Validation and estimates
  validateOrder: (widgetId: string, sideOverride?: OrderSide) => Promise<OrderValidationError[]>;
  calculateEstimate: (widgetId: string) => Promise<OrderEstimate | null>;
  updateValidationRules: (widgetId: string, rules: ExtendedOrderValidationRules) => void;

  /**
   * Submit an order. `side` is passed explicitly rather than read back from
   * `formData` so that a click can never be executed against a side written by
   * a later click.
   */
  placeOrder: (widgetId: string, side: OrderSide, clientOrderId?: string) => Promise<OrderSubmitResponse>;
  
  // UI state management
  setLoading: (widgetId: string, loading: boolean) => void;
  setSubmitting: (widgetId: string, submitting: boolean) => void;
  clearLastResponse: (widgetId: string) => void;
}

const defaultFormData: OrderFormData = {
  symbol: '',
  side: 'buy',
  type: 'market',
  amount: 0,
  price: undefined,
  stopPrice: undefined,
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  timeInForce: 'GTC',
  reduceOnly: false,
  postOnly: false,
  clientOrderId: undefined,
};

const defaultAdvancedOptions: AdvancedOrderOptions = {
  stopLoss: {
    enabled: false,
    price: undefined,
    percentage: undefined,
    trailing: false,
    trailingAmount: undefined,
  },
  takeProfit: {
    enabled: false,
    price: undefined,
    percentage: undefined,
  },
  icebergQty: undefined,
  quoteOrderQty: undefined,
};

const defaultWidgetState: PlaceOrderWidgetState = {
  formData: { ...defaultFormData },
  selectedGroupId: null,
  isAdvancedMode: false,
  validationErrors: [],
  orderEstimate: null,
  validationRules: null,
  isLoading: false,
  isSubmitting: false,
  lastOrderResponse: null,
  advancedOptions: { ...defaultAdvancedOptions },
};

export const usePlaceOrderStore = create<PlaceOrderWidgetsStore>()(
  immer((set, get) => ({
    widgets: {},
    
    getWidget: (widgetId: string) => {
      const state = get();
      return state.widgets[widgetId] || { ...defaultWidgetState };
    },
    
    initializeWidget: (widgetId: string, groupId?: string) => {
      set((state) => {
        state.widgets[widgetId] = {
          ...defaultWidgetState,
          selectedGroupId: groupId || null,
        };
      });
    },
    
    removeWidget: (widgetId: string) => {
      set((state) => {
        delete state.widgets[widgetId];
      });
    },
    
    updateFormData: (widgetId: string, updates: Partial<OrderFormData>) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        
        Object.assign(state.widgets[widgetId].formData, updates);

        // Clear the stale estimate; validationErrors are recomputed immediately
        // below and must NOT be blanked in the meantime — an empty error list is
        // what enables the Buy/Sell buttons.
        state.widgets[widgetId].orderEstimate = null;
      });

      // Revalidate synchronously. Doing this on a 100ms timer left a window in
      // which the form reported itself valid (no errors yet) while holding
      // values that were not.
      get().validateOrder(widgetId);
      get().calculateEstimate(widgetId);
    },
    
    resetForm: (widgetId: string) => {
      set((state) => {
        if (state.widgets[widgetId]) {
          state.widgets[widgetId].formData = { ...defaultFormData };
          state.widgets[widgetId].validationErrors = [];
          state.widgets[widgetId].orderEstimate = null;
          state.widgets[widgetId].lastOrderResponse = null;
        }
      });
    },
    
    toggleAdvancedMode: (widgetId: string) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        state.widgets[widgetId].isAdvancedMode = !state.widgets[widgetId].isAdvancedMode;
      });
    },
    
    updateAdvancedOptions: (widgetId: string, options: Partial<AdvancedOrderOptions>) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        
        Object.assign(state.widgets[widgetId].advancedOptions, options);
      });
    },
    
    validateOrder: async (widgetId: string, sideOverride?: OrderSide): Promise<OrderValidationError[]> => {
      const widget = get().getWidget(widgetId);
      const { formData, validationRules } = widget;
      // The side being validated: at submit time this is the side of the click,
      // not whatever is currently sitting in formData.
      const side = sideOverride ?? formData.side;
      const errors: OrderValidationError[] = [];

      // Basic validation
      if (!formData.symbol) {
        errors.push({ field: 'symbol', message: 'Symbol is required' });
      }

      if (!Number.isFinite(formData.amount) || formData.amount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
      }

      if (formData.type === 'limit' && (!formData.price || formData.price <= 0)) {
        errors.push({ field: 'price', message: 'Price is required for limit orders' });
      }

      if (formData.type === 'stop_loss' && (!formData.stopPrice || formData.stopPrice <= 0)) {
        errors.push({ field: 'stopPrice', message: 'Stop price is required for stop loss orders' });
      }

      if (!validationRules) {
        // No constraints means no min/max qty, no notional floor and no balance
        // check. Refuse the order outright rather than submitting one that has
        // only been checked for `amount > 0`.
        errors.push({
          field: 'symbol',
          message: 'Market data unavailable — cannot validate this order',
        });
      } else {
        const { symbol: constraints, balance, marketPrice, balanceLoaded } = validationRules;

        if (formData.amount < constraints.minQty) {
          errors.push({
            field: 'amount',
            message: `Minimum quantity is ${constraints.minQty}`
          });
        }

        if (formData.amount > constraints.maxQty) {
          errors.push({
            field: 'amount',
            message: `Maximum quantity is ${constraints.maxQty}`
          });
        }

        if (formData.price && formData.price < constraints.minPrice) {
          errors.push({
            field: 'price',
            message: `Minimum price is ${constraints.minPrice}`
          });
        }

        if (formData.price && formData.price > constraints.maxPrice) {
          errors.push({
            field: 'price',
            message: `Maximum price is ${constraints.maxPrice}`
          });
        }

        // Reference price for notional/balance math. A market order is sized off
        // the live ticker and NOTHING else: the previous fallback to
        // `constraints.maxPrice || 1` either blocked every order (maxPrice is
        // Infinity when the venue reports no cap) or, when maxPrice was 0,
        // valued a 10 BTC order at 10 USDT and waved it through.
        const limitPrice = formData.price && formData.price > 0 ? formData.price : undefined;
        const livePrice = marketPrice && marketPrice > 0 ? marketPrice : undefined;
        const referencePrice = formData.type === 'market' ? livePrice : (limitPrice ?? livePrice);

        if (formData.type === 'market' && referencePrice === undefined) {
          errors.push({
            field: 'amount',
            message: 'No live market price available — cannot size a market order',
          });
        }

        if (referencePrice !== undefined && formData.amount > 0) {
          const notional = notionalValue(formData.amount, referencePrice);

          if (constraints.minNotional > 0 && notional < constraints.minNotional) {
            errors.push({
              field: 'amount',
              message: `Order value ${notional} is below the ${constraints.minNotional} ${balance.currency} minimum`,
            });
          }

          // Balance validation, per side. Only enforced once the real balance has
          // loaded — avoids a false "insufficient" during the pre-fetch window
          // where available is still 0 because nothing has been fetched yet.
          if (balanceLoaded) {
            if (side === 'buy') {
              // A buy spends quote.
              if (notional > balance.available) {
                errors.push({
                  field: 'amount',
                  message: `Insufficient ${balance.currency}. Order needs ${notional}, available ${balance.available}`,
                });
              }
            } else {
              // A sell spends base. Missing base balance counts as zero: if the
              // balance is loaded and we still do not know the holding, block.
              const baseAvailable = balance.baseAvailable ?? 0;
              if (formData.amount > baseAvailable) {
                errors.push({
                  field: 'amount',
                  message: `Insufficient ${balance.baseCurrency || 'balance'}. Order needs ${formData.amount}, available ${baseAvailable}`,
                });
              }
            }
          }
        }
      }

      // Update widget state
      set((state) => {
        if (state.widgets[widgetId]) {
          state.widgets[widgetId].validationErrors = errors;
        }
      });

      return errors;
    },
    
    calculateEstimate: async (widgetId: string): Promise<OrderEstimate | null> => {
      const widget = get().getWidget(widgetId);
      const { formData, validationRules } = widget;
      
      if (!validationRules || !formData.symbol || formData.amount <= 0) {
        return null;
      }
      
      const { symbol: constraints, balance, marketPrice, takerFeeRate } = validationRules;

      // Reference price: the live ticker, or the form's own limit price. There is
      // deliberately no fallback to `constraints.maxPrice` — that is a hard cap,
      // not a market price, and using it silently misprices the estimate.
      const livePrice = marketPrice && marketPrice > 0 ? marketPrice : undefined;
      const limitPrice = formData.price && formData.price > 0 ? formData.price : undefined;
      const price = formData.type === 'market' ? livePrice : (limitPrice ?? livePrice);

      // Without a usable price we cannot estimate cost / max amount meaningfully.
      if (!price || price <= 0) {
        return null;
      }

      const estimatedCost = notionalValue(formData.amount, price);
      const feeRate = typeof takerFeeRate === 'number' && takerFeeRate >= 0 ? takerFeeRate : 0.001;
      const commission = Number((estimatedCost * feeRate).toFixed(8));

      // Max size is side-dependent: a buy is capped by the quote budget, a sell
      // by the base holding.
      const maxAmount = formData.side === 'sell'
        ? Math.min(constraints.maxQty, balance.baseAvailable ?? 0)
        : Math.min(constraints.maxQty, balance.available / price);

      const estimate: OrderEstimate = {
        estimatedCost,
        commission,
        commissionCurrency: balance.currency,
        available: balance.available,
        maxAmount,
        minAmount: constraints.minQty,
        priceStep: constraints.tickSize,
        amountStep: constraints.stepSize,
      };
      
      // Update widget state
      set((state) => {
        if (state.widgets[widgetId]) {
          state.widgets[widgetId].orderEstimate = estimate;
        }
      });
      
      return estimate;
    },
    
    updateValidationRules: (widgetId: string, rules: ExtendedOrderValidationRules) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        state.widgets[widgetId].validationRules = rules;
      });
    },
    
    placeOrder: async (widgetId: string, side: OrderSide, clientOrderId?: string): Promise<OrderSubmitResponse> => {
      // Submit mutex. This runs to the first `await` without interruption, so
      // claiming the flag here — before any validation or dynamic import — is a
      // real lock: a second click cannot get past this point while the first is
      // in flight. Previously `setSubmitting` happened after validation, behind
      // a 100ms timer, and two clicks placed two orders.
      if (get().getWidget(widgetId).isSubmitting) {
        return { success: false, error: 'An order is already being submitted.' };
      }
      get().setSubmitting(widgetId, true);

      const fail = (message: string): OrderSubmitResponse => {
        const response: OrderSubmitResponse = { success: false, error: message };
        set((state) => {
          if (state.widgets[widgetId]) {
            state.widgets[widgetId].lastOrderResponse = response;
          }
        });
        return response;
      };

      try {
        // Commit the clicked side and an idempotency key for THIS attempt. The
        // side arrives as an argument rather than being read back from the
        // store, so a second click cannot retarget an in-flight submission.
        const idempotencyKey = clientOrderId ?? generateClientOrderId();
        set((state) => {
          if (!state.widgets[widgetId]) {
            state.widgets[widgetId] = { ...defaultWidgetState };
          }
          state.widgets[widgetId].formData.side = side;
          state.widgets[widgetId].formData.clientOrderId = idempotencyKey;
        });

        const errors = await get().validateOrder(widgetId, side);
        if (errors.length > 0) {
          return fail(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
        }

        const widget = get().getWidget(widgetId);
        const rules = widget.validationRules;
        if (!rules) {
          return fail('Market data unavailable — refusing to place an unvalidated order.');
        }

        // Get group information for the order
        const { useGroupStore } = await import('./groupStore');
        const groupStore = useGroupStore.getState();
        const selectedGroup = widget.selectedGroupId
          ? groupStore.getGroupById(widget.selectedGroupId)
          : null;

        if (!selectedGroup?.account || !selectedGroup?.exchange || !selectedGroup?.market) {
          throw new Error('No trading account selected. Please select an account through the group selector.');
        }

        const { amount, price, stopPrice, type } = widget.formData;
        const constraints = rules.symbol;

        // Snap onto the exchange's grid. Amount always rounds DOWN so we never
        // trade more than the user asked for. Prices round in the direction that
        // cannot worsen the fill: down for a buy (never bid higher), up for a
        // sell (never ask lower).
        const amountStep = safeStep(constraints.stepSize);
        const priceStep = safeStep(constraints.tickSize);
        const priceMode = side === 'buy' ? 'floor' : 'ceil';

        const roundedAmount = amountStep ? roundToStep(amount, amountStep, 'floor') : amount;
        const roundedPrice = price && priceStep ? roundToStep(price, priceStep, priceMode) : price;
        const roundedStopPrice = stopPrice && priceStep
          ? roundToStep(stopPrice, priceStep, priceMode)
          : stopPrice;

        // Rounding down can push a size under a floor it previously cleared, so
        // the size-dependent limits are re-checked against the value that will
        // actually be sent.
        if (roundedAmount <= 0) {
          return fail(
            `Amount ${amount} rounds to zero at this market's step size (${constraints.stepSize}).`
          );
        }
        if (roundedAmount < constraints.minQty) {
          return fail(
            `Amount ${roundedAmount} (rounded from ${amount}) is below the ${constraints.minQty} minimum.`
          );
        }

        const settlementPrice = type === 'market'
          ? (rules.marketPrice && rules.marketPrice > 0 ? rules.marketPrice : undefined)
          : (roundedPrice || undefined);

        if (type === 'market' && settlementPrice === undefined) {
          return fail('No live market price available — refusing to place a market order.');
        }

        if (settlementPrice !== undefined && constraints.minNotional > 0) {
          const notional = notionalValue(roundedAmount, settlementPrice);
          if (notional < constraints.minNotional) {
            return fail(
              `Order value ${notional} (after rounding) is below the ${constraints.minNotional} ${rules.balance.currency} minimum.`
            );
          }
        }

        const orderRequest: PlaceOrderRequest = {
          ...widget.formData,
          side,
          amount: roundedAmount,
          price: roundedPrice,
          stopPrice: roundedStopPrice,
          clientOrderId: idempotencyKey,
          exchange: selectedGroup.exchange,
          accountId: selectedGroup.account,
          market: selectedGroup.market,
        };

        // Import order execution service
        const { executeOrder } = await import('../services/orderExecutionService');
        const response = await executeOrder(orderRequest, widget.advancedOptions);

        set((state) => {
          if (state.widgets[widgetId]) {
            state.widgets[widgetId].lastOrderResponse = response;
            if (response.success) {
              // Reset form on successful order
              state.widgets[widgetId].formData = { ...defaultFormData };
            }
          }
        });

        return response;

      } catch (error) {
        return fail(error instanceof Error ? error.message : 'Unknown error occurred');

      } finally {
        get().setSubmitting(widgetId, false);
      }
    },
    
    setLoading: (widgetId: string, loading: boolean) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        state.widgets[widgetId].isLoading = loading;
      });
    },
    
    setSubmitting: (widgetId: string, submitting: boolean) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        state.widgets[widgetId].isSubmitting = submitting;
      });
    },
    
    clearLastResponse: (widgetId: string) => {
      set((state) => {
        if (state.widgets[widgetId]) {
          state.widgets[widgetId].lastOrderResponse = null;
        }
      });
    },
  }))
); 