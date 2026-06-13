import React, { useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, AlertCircle, CheckCircle, X } from 'lucide-react';
import { usePlaceOrderStore } from '../../store/placeOrderStore';
import { useGroupStore } from '../../store/groupStore';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useOrderFormWidgetStore } from '../../store/orderFormWidgetStore';
import { getMarketConstraints } from '../../services/orderExecutionService';
import { formatVolume } from '../../utils/formatters';
import type { OrderType, OrderSide, OrderValidationRules } from '../../types/orders';
import type { MarketType } from '../../types/dataProviders';

interface OrderFormWidgetProps {
  widgetId?: string;
  dashboardId?: string;
  selectedGroupId?: string;
}

const OrderFormWidget: React.FC<OrderFormWidgetProps> = ({
  widgetId = 'order-form-widget',
  dashboardId = 'default',
  selectedGroupId
}) => {
  // Store hooks
  const {
    getWidget,
    initializeWidget,
    updateFormData,
    toggleAdvancedMode,
    updateAdvancedOptions,
    updateValidationRules,
    placeOrder,
    setLoading,
    clearLastResponse
  } = usePlaceOrderStore();

  const { getGroupById, selectedGroupId: globalSelectedGroupId } = useGroupStore();
  const {
    getTicker,
    initializeTickerData,
    subscribe,
    unsubscribe,
    activeProviderId,
  } = useDataProviderStore();

  // Persisted per-widget settings (default order type/TIF, post/reduce-only, confirm).
  const orderFormSettings = useOrderFormWidgetStore((s) => s.getWidget(widgetId).settings);

  // Widget state
  const widget = getWidget(widgetId);
  const {
    formData,
    isAdvancedMode,
    validationErrors,
    orderEstimate,
    validationRules,
    isLoading,
    isSubmitting,
    lastOrderResponse,
    advancedOptions
  } = widget;

  // Current group (from props or global selection)
  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const selectedGroup = currentGroupId ? getGroupById(currentGroupId) : null;

  // Check if we have complete trading setup
  const isInstrumentSelected = selectedGroup && 
    selectedGroup.account && 
    selectedGroup.exchange && 
    selectedGroup.market && 
    selectedGroup.tradingPair;

  const exchange = selectedGroup?.exchange || '';
  const symbol = selectedGroup?.tradingPair || '';
  const market = (selectedGroup?.market || 'spot') as MarketType;
  const accountId = selectedGroup?.account || '';

  // Live ticker price for this instrument (public market data). Reading from the
  // store re-renders as updates stream in via the subscription effect below.
  const ticker = isInstrumentSelected ? getTicker(exchange, symbol, market) : null;
  const livePrice = ticker?.last ?? ticker?.midPrice ?? ticker?.close ??
    (ticker && ticker.bid && ticker.ask ? (ticker.bid + ticker.ask) / 2 : undefined);

  // Initialize widget on mount, seeding the form with the persisted defaults
  // (order type, time-in-force, post-only / reduce-only flags).
  useEffect(() => {
    initializeWidget(widgetId, currentGroupId || undefined);
    updateFormData(widgetId, {
      type: orderFormSettings.defaultOrderType,
      timeInForce: orderFormSettings.defaultTimeInForce,
      postOnly: orderFormSettings.postOnly,
      reduceOnly: orderFormSettings.reduceOnly,
    });
    // Only re-seed on widget/group change, not on every settings edit (those apply
    // to the NEXT init); the settings panel is the place to change live values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeWidget, updateFormData, widgetId, currentGroupId]);

  // Update form symbol when group changes
  useEffect(() => {
    if (isInstrumentSelected && symbol !== formData.symbol) {
      updateFormData(widgetId, { symbol });
    }
  }, [isInstrumentSelected, symbol, formData.symbol, updateFormData, widgetId]);

  // Base/quote currencies (e.g. BTC/USDT) for display and balance lookups.
  const baseCurrency = symbol.split('/')[0] || '';
  const quoteCurrency = symbol.split('/')[1] || '';

  // Load market constraints when instrument changes
  useEffect(() => {
    if (!isInstrumentSelected) return;

    let isCancelled = false;

    const loadConstraints = async () => {
      try {
        setLoading(widgetId, true);

        const constraints = await getMarketConstraints(exchange, symbol, market);

        if (isCancelled) return;

        // DEFERRED (account-coupled, task #5 §A / blocked by #3): real available
        // balance must come from fetchBalance(accountId) for `quoteCurrency` once
        // accounts-fe's trading→accountId migration lands. Until then we seed a
        // placeholder so the constraints/estimate UI is exercisable; the estimate
        // and max-amount math already key off the LIVE ticker price below, so only
        // the "Available" figure is a stand-in. See handleRefresh wiring + the
        // SendMessage thread with accounts-fe for the final getBalance signature.
        const placeholderBalance = {
          available: 0,
          currency: quoteCurrency || 'USDT',
        };

        const rules: OrderValidationRules = {
          symbol: constraints,
          balance: placeholderBalance,
          // Seed with the current live price if we already have a ticker; the
          // ticker effect keeps marketPrice fresh as updates stream in.
          marketPrice: livePrice,
          leverage: market === 'futures' ? 1 : undefined,
          marginMode: market === 'futures' ? 'isolated' : undefined,
        };

        updateValidationRules(widgetId, rules);
      } catch (error) {
        console.error('[OrderForm] Failed to load constraints:', error);
      } finally {
        if (!isCancelled) {
          setLoading(widgetId, false);
        }
      }
    };

    loadConstraints();

    return () => {
      isCancelled = true;
    };
    // livePrice is intentionally omitted: it only SEEDS the rules here; the
    // marketPrice-sync effect below keeps it current without refetching constraints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstrumentSelected, exchange, symbol, market, quoteCurrency, setLoading, updateValidationRules, widgetId]);

  // Live ticker subscription (public market data — no account/credentials needed).
  // REST-seed via initializeTickerData, then stream updates with subscribe('ticker');
  // mirrors the plumbing Chart/Trades/OrderBook use. The component reads the latest
  // value through getTicker() above on each store update.
  useEffect(() => {
    if (!isInstrumentSelected || !activeProviderId) return;

    let isCancelled = false;
    const subscriberId = `${dashboardId}-${widgetId}`;

    const startTicker = async () => {
      try {
        await initializeTickerData(exchange, symbol, market);
        if (isCancelled) return;
        await subscribe(subscriberId, exchange, symbol, 'ticker', undefined, market);
      } catch (error) {
        // Non-fatal: the form still works off REST constraints + any cached ticker.
        console.error('[OrderForm] Failed to start ticker subscription:', error);
      }
    };

    startTicker();

    return () => {
      isCancelled = true;
      unsubscribe(subscriberId, exchange, symbol, 'ticker', undefined, market);
    };
  }, [isInstrumentSelected, activeProviderId, exchange, symbol, market, dashboardId, widgetId, initializeTickerData, subscribe, unsubscribe]);

  // Keep validationRules.marketPrice in sync with the live ticker so the estimate
  // and max-amount/balance checks track the real market price, not maxPrice.
  useEffect(() => {
    if (!isInstrumentSelected || !validationRules || !livePrice || livePrice <= 0) return;
    if (validationRules.marketPrice === livePrice) return;
    updateValidationRules(widgetId, { ...validationRules, marketPrice: livePrice });
  }, [livePrice, isInstrumentSelected, validationRules, updateValidationRules, widgetId]);

  // Form handlers
  const handleOrderTypeChange = useCallback((type: OrderType) => {
    updateFormData(widgetId, { type });
  }, [updateFormData, widgetId]);

  const handleSideChange = useCallback((side: OrderSide) => {
    updateFormData(widgetId, { side });
  }, [updateFormData, widgetId]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    updateFormData(widgetId, { amount: value });
  }, [updateFormData, widgetId]);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    updateFormData(widgetId, { price: value });
  }, [updateFormData, widgetId]);

  const handleStopPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    updateFormData(widgetId, { stopPrice: value });
  }, [updateFormData, widgetId]);

  const handleQuantityAdjust = useCallback((delta: number) => {
    const stepSize = validationRules?.symbol?.stepSize || 0.00000001;
    const newAmount = Math.max(0, formData.amount + (delta * stepSize));
    updateFormData(widgetId, { amount: newAmount });
  }, [formData.amount, validationRules, updateFormData, widgetId]);

  const handleSubmit = useCallback(async (side: OrderSide) => {
    if (isSubmitting) return;

    // Optional confirmation gate (settings.confirmBeforeSubmit).
    if (orderFormSettings.confirmBeforeSubmit) {
      const priceLabel = formData.type === 'market'
        ? (livePrice ? `~${formatVolume(livePrice)} ${quoteCurrency}` : 'market price')
        : `${formData.price || 0} ${quoteCurrency}`;
      const ok = window.confirm(
        `Place ${side.toUpperCase()} ${formData.type} order: ${formData.amount} ${baseCurrency} @ ${priceLabel}?`
      );
      if (!ok) return;
    }

    updateFormData(widgetId, { side });

    // Small delay to let the side update propagate
    setTimeout(() => {
      placeOrder(widgetId);
    }, 100);
  }, [isSubmitting, orderFormSettings.confirmBeforeSubmit, formData.type, formData.amount, formData.price, livePrice, quoteCurrency, baseCurrency, updateFormData, placeOrder, widgetId]);



  // Validation helpers
  const getFieldError = useCallback((field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  }, [validationErrors]);

  const isFormValid = validationErrors.length === 0;

  // (baseCurrency / quoteCurrency are declared above, near the constraints effect.)

  const estimatedCost = useMemo(() => {
    if (!orderEstimate) return 0;
    return orderEstimate.estimatedCost;
  }, [orderEstimate]);

  const commission = useMemo(() => {
    if (!orderEstimate) return 0;
    return orderEstimate.commission;
  }, [orderEstimate]);

  if (!isInstrumentSelected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-terminal-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-terminal-text mb-2">
            No Trading Instrument Selected
          </h3>
          <p className="text-sm text-terminal-muted mb-4">
            Please select an account, exchange, market, and trading pair using the group selector in the widget header.
          </p>
          <div className="bg-terminal-accent/20 p-3 rounded-md text-xs text-terminal-muted">
            Current selection: {selectedGroup ? Object.entries({
              account: selectedGroup.account || 'Not set',
              exchange: selectedGroup.exchange || 'Not set', 
              market: selectedGroup.market || 'Not set',
              pair: selectedGroup.tradingPair || 'Not set'
            }).map(([k, v]) => `${k}: ${v}`).join(', ') : 'No group selected'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Instrument display */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center px-4 py-2 bg-terminal-accent/30 rounded-md flex-1">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-sm mr-2 text-white">
            {baseCurrency.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{symbol}</span>
            <span className="text-xs flex items-center text-terminal-muted">
              {exchange} • {market}
            </span>
          </div>
        </div>
        {/* Live price from the ticker subscription */}
        <div className="ml-3 text-right">
          <div className="text-xs text-terminal-muted">Last Price</div>
          <div className="text-sm font-medium font-mono text-terminal-text">
            {livePrice && livePrice > 0
              ? `${formatVolume(livePrice)} ${quoteCurrency}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Trading status. validationRules===null is a transient pre-load state, not
          an error — show a soft "loading" message instead of "unavailable". */}
      {isLoading ? (
        <div className="bg-terminal-accent/30 p-3 rounded-md mb-4">
          <div className="text-sm text-terminal-muted">Loading market data…</div>
        </div>
      ) : !validationRules ? (
        <div className="bg-terminal-accent/30 p-3 rounded-md mb-4">
          <div className="text-sm text-terminal-muted">Waiting for market data…</div>
        </div>
      ) : !livePrice ? (
        <div className="bg-terminal-accent/20 p-3 rounded-md mb-4">
          <div className="text-sm text-terminal-muted">
            Constraints loaded — waiting for a live price to estimate cost…
          </div>
        </div>
      ) : null}

      {/* Order type tabs */}
      <div className="mb-4">
        <div className="flex border-b border-terminal-border">
          {(['market', 'limit', 'stop_loss'] as OrderType[]).map(type => (
            <button 
              key={type}
              className={`flex-1 py-2 text-sm font-medium ${
                formData.type === type ? 'border-b-2 border-blue-500 text-blue-400' : 'text-terminal-muted hover:text-terminal-text'
              }`}
              onClick={() => handleOrderTypeChange(type)}
            >
              {type === 'stop_loss' ? 'Stop' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <form className="space-y-4 flex-grow overflow-y-auto">
        {/* Price field */}
        {(formData.type === 'limit' || formData.type === 'stop_loss') && (
          <div>
            <label className="block text-sm text-terminal-muted mb-1">
              {formData.type === 'stop_loss' ? 'Stop Price' : 'Execution Price'}
            </label>
            <div className="relative">
              <input 
                type="number" 
                step={validationRules?.symbol?.tickSize || 0.00000001}
                className={`w-full bg-terminal-accent/30 border rounded-md py-2 px-3 text-sm ${
                  getFieldError(formData.type === 'stop_loss' ? 'stopPrice' : 'price')
                    ? 'border-red-500' 
                    : 'border-terminal-border'
                }`}
                value={formData.type === 'stop_loss' ? (formData.stopPrice || '') : (formData.price || '')}
                onChange={formData.type === 'stop_loss' ? handleStopPriceChange : handlePriceChange}
                placeholder={`Enter ${formData.type === 'stop_loss' ? 'stop' : 'limit'} price`}
              />
            </div>
            {getFieldError(formData.type === 'stop_loss' ? 'stopPrice' : 'price') && (
              <p className="text-xs text-red-500 mt-1">
                {getFieldError(formData.type === 'stop_loss' ? 'stopPrice' : 'price')}
              </p>
            )}
          </div>
        )}

        {formData.type === 'market' && (
          <div>
            <label className="block text-sm text-terminal-muted mb-1">Execution Price</label>
            <div className="w-full bg-terminal-accent/20 border border-terminal-border rounded-md py-2 px-3 text-sm">
              Market Price
            </div>
          </div>
        )}
        
        {/* Quantity field */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-terminal-muted">Quantity</label>
            <div className="flex items-center">
              <span className="text-xs mr-1">×{validationRules?.symbol?.stepSize || 1}</span>
              <ChevronDown size={14} className="text-terminal-muted" />
            </div>
          </div>
          <div className="relative flex items-center">
            <input 
              type="number" 
              step={validationRules?.symbol?.stepSize || 0.00000001}
              className={`w-full bg-terminal-accent/30 border rounded-md py-2 px-3 pr-16 text-sm ${
                getFieldError('amount') ? 'border-red-500' : 'border-terminal-border'
              }`}
              value={formData.amount || ''}
              onChange={handleAmountChange}
              placeholder={`Min: ${validationRules?.symbol?.minQty || 0}`}
            />
            <div className="absolute right-0 h-full flex">
              <button 
                type="button"
                className="px-3 py-2 text-terminal-muted border-l border-terminal-border hover:bg-terminal-accent/30 transition-colors"
                onClick={() => handleQuantityAdjust(-1)}
              >
                –
              </button>
              <button 
                type="button"
                className="px-3 py-2 text-terminal-muted border-l border-terminal-border hover:bg-terminal-accent/30 transition-colors"
                onClick={() => handleQuantityAdjust(1)}
              >
                +
              </button>
            </div>
          </div>
          {getFieldError('amount') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('amount')}</p>
          )}
        </div>
        
        {/* Advanced Options Toggle */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => toggleAdvancedMode(widgetId)}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${
              isAdvancedMode 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'text-terminal-muted hover:text-terminal-text border border-terminal-border hover:border-terminal-accent'
            }`}
          >
            {isAdvancedMode ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
        
        {/* Advanced options */}
        {isAdvancedMode && (
          <div className="space-y-3 p-3 bg-terminal-accent/10 rounded-md">
            <h4 className="text-sm font-medium text-terminal-text mb-2">Advanced Options</h4>
            
            {/* Stop Loss */}
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="stopLoss"
                  checked={advancedOptions.stopLoss?.enabled || false}
                  onChange={(e) => updateAdvancedOptions(widgetId, {
                    stopLoss: { ...advancedOptions.stopLoss, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <label htmlFor="stopLoss" className="text-sm text-terminal-text">Stop Loss</label>
              </div>
              {advancedOptions.stopLoss?.enabled && (
                <input
                  type="number"
                  placeholder="Stop loss price"
                  value={advancedOptions.stopLoss?.price || ''}
                  onChange={(e) => updateAdvancedOptions(widgetId, {
                    stopLoss: { ...advancedOptions.stopLoss, price: parseFloat(e.target.value) || undefined }
                  })}
                  className="w-full bg-terminal-accent/30 border border-terminal-border rounded-md py-1 px-2 text-sm"
                />
              )}
            </div>

            {/* Take Profit */}
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="takeProfit"
                  checked={advancedOptions.takeProfit?.enabled || false}
                  onChange={(e) => updateAdvancedOptions(widgetId, {
                    takeProfit: { ...advancedOptions.takeProfit, enabled: e.target.checked }
                  })}
                  className="mr-2"
                />
                <label htmlFor="takeProfit" className="text-sm text-terminal-text">Take Profit</label>
              </div>
              {advancedOptions.takeProfit?.enabled && (
                <input
                  type="number"
                  placeholder="Take profit price"
                  value={advancedOptions.takeProfit?.price || ''}
                  onChange={(e) => updateAdvancedOptions(widgetId, {
                    takeProfit: { ...advancedOptions.takeProfit, price: parseFloat(e.target.value) || undefined }
                  })}
                  className="w-full bg-terminal-accent/30 border border-terminal-border rounded-md py-1 px-2 text-sm"
                />
              )}
            </div>
          </div>
        )}
        
        {/* Estimated Cost */}
        <div>
          <label className="block text-sm text-terminal-muted mb-1">Estimated Cost</label>
          <div className="w-full bg-terminal-accent/20 border border-terminal-border rounded-md py-2 px-3 text-sm">
            {estimatedCost > 0 ? `${formatVolume(estimatedCost)} ${quoteCurrency}` : '—'}
          </div>
        </div>
        
        {/* Commission */}
        <div>
          <label className="block text-sm text-terminal-muted mb-1">Commission</label>
          <div className="w-full bg-terminal-accent/20 border border-terminal-border rounded-md py-2 px-3 text-sm">
                         {commission > 0 ? `~${formatVolume(commission)} ${quoteCurrency}` : 'Calculated on execution'}
          </div>
        </div>
        
        {/* Balance info.
            DEFERRED (task #5 §A / blocked by #3): "Available" and the balance-derived
            "Max Amount" come from a placeholder balance until fetchBalance(accountId)
            is wired (see the constraints effect TODO). The estimate/price are live. */}
        {orderEstimate && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <div className="text-sm text-terminal-muted mb-1">Available</div>
              <div className="flex justify-between text-xs">
                <span>
                  {orderEstimate.available > 0 ? formatVolume(orderEstimate.available) : '—'}
                </span>
                <span>{quoteCurrency}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-terminal-muted mb-1">Max Amount</div>
              <div className="flex justify-between text-xs">
                <span>
                  {orderEstimate.available > 0 ? formatVolume(orderEstimate.maxAmount) : '—'}
                </span>
                <span>{baseCurrency}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Order Response */}
        {lastOrderResponse && (
          <div className={`p-3 rounded-md mb-4 ${
            lastOrderResponse.success 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className="flex items-center">
              {lastOrderResponse.success ? (
                <CheckCircle size={16} className="text-green-400 mr-2" />
              ) : (
                <AlertCircle size={16} className="text-red-400 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                lastOrderResponse.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {lastOrderResponse.success ? 'Order Placed Successfully' : 'Order Failed'}
              </span>
              <button
                onClick={() => clearLastResponse(widgetId)}
                className="ml-auto p-1 rounded hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>
            {lastOrderResponse.orderId && (
              <p className="text-xs text-terminal-muted mt-1">
                Order ID: {lastOrderResponse.orderId}
              </p>
            )}
            {lastOrderResponse.error && (
              <p className="text-xs text-red-300 mt-1">
                {lastOrderResponse.error}
              </p>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
          <button 
            type="button" 
            disabled={!isFormValid || isSubmitting || isLoading}
            className="w-full py-2.5 rounded-md font-medium bg-terminal-positive hover:bg-terminal-positive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
            onClick={() => handleSubmit('buy')}
          >
            {isSubmitting && formData.side === 'buy' ? 'Placing...' : `Buy ${baseCurrency}`}
          </button>
          <button 
            type="button" 
            disabled={!isFormValid || isSubmitting || isLoading}
            className="w-full py-2.5 rounded-md font-medium bg-terminal-negative hover:bg-terminal-negative/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
            onClick={() => handleSubmit('sell')}
          >
            {isSubmitting && formData.side === 'sell' ? 'Placing...' : `Sell ${baseCurrency}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderFormWidget;
