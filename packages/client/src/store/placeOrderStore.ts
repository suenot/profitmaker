import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { 
  OrderFormData, 
  PlaceOrderRequest, 
  PlaceOrderResponse, 
  OrderValidationError,
  OrderEstimate,
  AdvancedOrderOptions,
  OrderValidationRules,
  MarketConstraints 
} from '../types/orders';

interface PlaceOrderWidgetState {
  // Basic order form state
  formData: OrderFormData;
  
  // Widget settings
  selectedGroupId: string | null;
  isAdvancedMode: boolean;
  
  // Order validation and estimates
  validationErrors: OrderValidationError[];
  orderEstimate: OrderEstimate | null;
  validationRules: OrderValidationRules | null;
  
  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  lastOrderResponse: PlaceOrderResponse | null;
  
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
  validateOrder: (widgetId: string) => Promise<OrderValidationError[]>;
  calculateEstimate: (widgetId: string) => Promise<OrderEstimate | null>;
  updateValidationRules: (widgetId: string, rules: OrderValidationRules) => void;
  
  // Order execution
  placeOrder: (widgetId: string) => Promise<PlaceOrderResponse>;
  
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
        
        // Clear validation errors when form data changes
        state.widgets[widgetId].validationErrors = [];
        state.widgets[widgetId].orderEstimate = null;
      });
      
      // Trigger validation and estimate calculation
      setTimeout(() => {
        get().validateOrder(widgetId);
        get().calculateEstimate(widgetId);
      }, 100);
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
    
    validateOrder: async (widgetId: string): Promise<OrderValidationError[]> => {
      const widget = get().getWidget(widgetId);
      const { formData, validationRules } = widget;
      const errors: OrderValidationError[] = [];
      
      // Basic validation
      if (!formData.symbol) {
        errors.push({ field: 'symbol', message: 'Symbol is required' });
      }
      
      if (formData.amount <= 0) {
        errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
      }
      
      if (formData.type === 'limit' && (!formData.price || formData.price <= 0)) {
        errors.push({ field: 'price', message: 'Price is required for limit orders' });
      }
      
      if (formData.type === 'stop_loss' && (!formData.stopPrice || formData.stopPrice <= 0)) {
        errors.push({ field: 'stopPrice', message: 'Stop price is required for stop loss orders' });
      }
      
      // Market-specific validation
      if (validationRules) {
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
        
        // Balance validation. Use the live ticker price for market orders (fall
        // back to the maxPrice cap only when no live price is available yet).
        // Only enforced once the real balance has loaded (balanceLoaded) — avoids
        // a false "insufficient" during the pre-fetch window where available is 0.
        const marketRefPrice = marketPrice && marketPrice > 0 ? marketPrice : (constraints.maxPrice || 1);
        const estimatedCost = formData.type === 'market'
          ? formData.amount * marketRefPrice
          : (formData.price || 0) * formData.amount;

        if (balanceLoaded && estimatedCost > balance.available) {
          errors.push({
            field: 'amount',
            message: `Insufficient balance. Available: ${balance.available} ${balance.currency}`
          });
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

      // Reference price: live ticker for market orders (fall back to the form's
      // limit price, then any live price, then the maxPrice cap as a last resort).
      const referencePrice = marketPrice && marketPrice > 0 ? marketPrice : constraints.maxPrice;
      const price = formData.type === 'market'
        ? referencePrice
        : (formData.price || referencePrice);

      // Without a usable price we cannot estimate cost / max amount meaningfully.
      if (!price || price <= 0) {
        return null;
      }

      const estimatedCost = price * formData.amount;
      const feeRate = typeof takerFeeRate === 'number' && takerFeeRate >= 0 ? takerFeeRate : 0.001;
      const commission = estimatedCost * feeRate;

      const estimate: OrderEstimate = {
        estimatedCost,
        commission,
        commissionCurrency: balance.currency,
        available: balance.available,
        maxAmount: Math.min(constraints.maxQty, balance.available / price),
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
    
    updateValidationRules: (widgetId: string, rules: OrderValidationRules) => {
      set((state) => {
        if (!state.widgets[widgetId]) {
          state.widgets[widgetId] = { ...defaultWidgetState };
        }
        state.widgets[widgetId].validationRules = rules;
      });
    },
    
    placeOrder: async (widgetId: string): Promise<PlaceOrderResponse> => {
      const widget = get().getWidget(widgetId);
      
      // Validate before placing order
      const errors = await get().validateOrder(widgetId);
      if (errors.length > 0) {
        const response: PlaceOrderResponse = {
          success: false,
          error: `Validation failed: ${errors.map(e => e.message).join(', ')}`,
        };
        
        set((state) => {
          if (state.widgets[widgetId]) {
            state.widgets[widgetId].lastOrderResponse = response;
          }
        });
        
        return response;
      }
      
      get().setSubmitting(widgetId, true);
      
      try {
        // Get group information for the order
        const { useGroupStore } = await import('./groupStore');
        const groupStore = useGroupStore.getState();
        const selectedGroup = widget.selectedGroupId 
          ? groupStore.getGroupById(widget.selectedGroupId)
          : null;
          
        if (!selectedGroup?.account || !selectedGroup?.exchange || !selectedGroup?.market) {
          throw new Error('No trading account selected. Please select an account through the group selector.');
        }
        
        const orderRequest: PlaceOrderRequest = {
          ...widget.formData,
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
        const response: PlaceOrderResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
        
        set((state) => {
          if (state.widgets[widgetId]) {
            state.widgets[widgetId].lastOrderResponse = response;
          }
        });
        
        return response;
        
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