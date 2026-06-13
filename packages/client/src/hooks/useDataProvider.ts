import { useEffect, useCallback, useMemo, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import {
  DataType,
  Timeframe,
  MarketType,
  ProviderOperationResult
} from '../types/dataProviders';

const DEFAULT_TIMEFRAME: Timeframe = '1m';
const DEFAULT_MARKET: MarketType = 'spot';

// NEW: Hook for provider-exchange mappings
export const useProviderMappings = (exchanges: string[]) => {
  const { getProviderExchangeMappings } = useDataProviderStore();

  return useMemo(() => {
    return getProviderExchangeMappings(exchanges);
  }, [exchanges, getProviderExchangeMappings]);
};

// NEW: Hook for getting provider for specific exchange
export const useProviderForExchange = (exchange: string) => {
  const { getProviderForExchange } = useDataProviderStore();

  return useMemo(() => {
    return getProviderForExchange(exchange);
  }, [exchange, getProviderForExchange]);
};

// Hook for using candle data
export const useCandles = (
  symbol: string,
  exchange: string,
  providerId?: string,
  dashboardId: string = 'default',
  widgetId: string = 'default',
  enabled: boolean = true
) => {
  const {
    activeProviderId,
    activeSubscriptions,
    getCandles,
    getSubscriptionKey,
    subscribe: subscribeToData,
    unsubscribe: unsubscribeFromData
  } = useDataProviderStore();

  const actualProviderId = providerId || activeProviderId;
  const [lastError, setLastError] = useState<string | null>(null);
  const subscriptionKey = getSubscriptionKey(exchange, symbol, 'candles', DEFAULT_TIMEFRAME, DEFAULT_MARKET, actualProviderId || undefined);
  const subscription = activeSubscriptions[subscriptionKey];
  const candleData = getCandles(exchange, symbol, DEFAULT_TIMEFRAME, DEFAULT_MARKET);

  const subscriptionId = useMemo(() =>
    `${actualProviderId || 'auto'}-${exchange}-${symbol}-candles-${dashboardId}-${widgetId}`,
    [actualProviderId, exchange, symbol, dashboardId, widgetId]
  );

  const subscribe = useCallback(async (): Promise<ProviderOperationResult | undefined> => {
    if (!enabled || !symbol || !exchange) {
      setLastError(null);
      return;
    }

    try {
      const result = await subscribeToData(
        subscriptionId,
        exchange,
        symbol,
        'candles',
        DEFAULT_TIMEFRAME,
        DEFAULT_MARKET,
        actualProviderId ? { providerId: actualProviderId } : undefined
      );
      setLastError(result.success ? null : result.error || 'Subscription failed');
      return result;
    } catch (error) {
      console.error('🛡️ Safe error handling for candles subscription:', error);
      const message = `Subscription error: ${error instanceof Error ? error.message : String(error)}`;
      setLastError(message);
      return { success: false, error: message };
    }
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, subscribeToData]);

  const unsubscribe = useCallback(() => {
    setLastError(null);
    if (!enabled || !symbol || !exchange) return;
    unsubscribeFromData(
      subscriptionId,
      exchange,
      symbol,
      'candles',
      DEFAULT_TIMEFRAME,
      DEFAULT_MARKET,
      actualProviderId ? { providerId: actualProviderId } : undefined
    );
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, unsubscribeFromData]);

  // Automatic subscription/unsubscription
  useEffect(() => {
    if (!enabled || !subscriptionId) {
      setLastError(null);
      return;
    }
    void subscribe().catch((error) => {
      setLastError(`Subscription error: ${error instanceof Error ? error.message : String(error)}`);
    });
    return () => unsubscribe();
  }, [enabled, subscribe, subscriptionId, unsubscribe]);

  return {
    data: candleData.length > 0 ? candleData : null,
    loading: enabled && !!subscription && subscription.lastUpdate === 0,
    error: lastError,
    lastUpdate: subscription?.lastUpdate || 0,
    subscribe,
    unsubscribe,
    isSubscribed: enabled && !!subscription
  };
};

// Hook for using trade data
export const useTrades = (
  symbol: string,
  exchange: string,
  providerId?: string,
  dashboardId: string = 'default',
  widgetId: string = 'default',
  enabled: boolean = true
) => {
  const {
    activeProviderId,
    activeSubscriptions,
    getSubscriptionKey,
    getTrades,
    subscribe: subscribeToData,
    unsubscribe: unsubscribeFromData
  } = useDataProviderStore();

  const actualProviderId = providerId || activeProviderId;
  const [lastError, setLastError] = useState<string | null>(null);
  const subscriptionKey = getSubscriptionKey(exchange, symbol, 'trades', undefined, DEFAULT_MARKET, actualProviderId || undefined);
  const subscription = activeSubscriptions[subscriptionKey];
  const tradeData = getTrades(exchange, symbol, DEFAULT_MARKET);

  const subscriptionId = useMemo(() =>
    `${actualProviderId || 'auto'}-${exchange}-${symbol}-trades-${dashboardId}-${widgetId}`,
    [actualProviderId, exchange, symbol, dashboardId, widgetId]
  );

  const subscribe = useCallback(async (): Promise<ProviderOperationResult | undefined> => {
    if (!enabled || !symbol || !exchange) {
      setLastError(null);
      return;
    }

    try {
      const result = await subscribeToData(
        subscriptionId,
        exchange,
        symbol,
        'trades',
        undefined,
        DEFAULT_MARKET,
        actualProviderId ? { providerId: actualProviderId } : undefined
      );
      setLastError(result.success ? null : result.error || 'Subscription failed');
      return result;
    } catch (error) {
      const message = `Subscription error: ${error instanceof Error ? error.message : String(error)}`;
      setLastError(message);
      return { success: false, error: message };
    }
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, subscribeToData]);

  const unsubscribe = useCallback(() => {
    setLastError(null);
    if (!enabled || !symbol || !exchange) return;
    unsubscribeFromData(
      subscriptionId,
      exchange,
      symbol,
      'trades',
      undefined,
      DEFAULT_MARKET,
      actualProviderId ? { providerId: actualProviderId } : undefined
    );
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, unsubscribeFromData]);

  useEffect(() => {
    if (!enabled || !subscriptionId) {
      setLastError(null);
      return;
    }
    void subscribe().catch((error) => {
      setLastError(`Subscription error: ${error instanceof Error ? error.message : String(error)}`);
    });
    return () => unsubscribe();
  }, [enabled, subscribe, subscriptionId, unsubscribe]);

  return {
    data: tradeData.length > 0 ? tradeData : null,
    loading: enabled && !!subscription && subscription.lastUpdate === 0,
    error: lastError,
    lastUpdate: subscription?.lastUpdate || 0,
    subscribe,
    unsubscribe,
    isSubscribed: enabled && !!subscription
  };
};

// Hook for using order book data
export const useOrderBook = (
  symbol: string,
  exchange: string,
  providerId?: string,
  dashboardId: string = 'default',
  widgetId: string = 'default',
  enabled: boolean = true
) => {
  const {
    activeProviderId,
    activeSubscriptions,
    getOrderBook,
    getSubscriptionKey,
    subscribe: subscribeToData,
    unsubscribe: unsubscribeFromData
  } = useDataProviderStore();

  const actualProviderId = providerId || activeProviderId;
  const [lastError, setLastError] = useState<string | null>(null);
  const subscriptionKey = getSubscriptionKey(exchange, symbol, 'orderbook', undefined, DEFAULT_MARKET, actualProviderId || undefined);
  const subscription = activeSubscriptions[subscriptionKey];
  const orderBookData = getOrderBook(exchange, symbol, DEFAULT_MARKET);

  const subscriptionId = useMemo(() =>
    `${actualProviderId || 'auto'}-${exchange}-${symbol}-orderbook-${dashboardId}-${widgetId}`,
    [actualProviderId, exchange, symbol, dashboardId, widgetId]
  );

  const subscribe = useCallback(async (): Promise<ProviderOperationResult | undefined> => {
    if (!enabled || !symbol || !exchange) {
      setLastError(null);
      return;
    }

    try {
      const result = await subscribeToData(
        subscriptionId,
        exchange,
        symbol,
        'orderbook',
        undefined,
        DEFAULT_MARKET,
        actualProviderId ? { providerId: actualProviderId } : undefined
      );
      setLastError(result.success ? null : result.error || 'Subscription failed');
      return result;
    } catch (error) {
      const message = `Subscription error: ${error instanceof Error ? error.message : String(error)}`;
      setLastError(message);
      return { success: false, error: message };
    }
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, subscribeToData]);

  const unsubscribe = useCallback(() => {
    setLastError(null);
    if (!enabled || !symbol || !exchange) return;
    unsubscribeFromData(
      subscriptionId,
      exchange,
      symbol,
      'orderbook',
      undefined,
      DEFAULT_MARKET,
      actualProviderId ? { providerId: actualProviderId } : undefined
    );
  }, [actualProviderId, enabled, exchange, symbol, subscriptionId, unsubscribeFromData]);

  useEffect(() => {
    if (!enabled || !subscriptionId) {
      setLastError(null);
      return;
    }
    void subscribe().catch((error) => {
      setLastError(`Subscription error: ${error instanceof Error ? error.message : String(error)}`);
    });
    return () => unsubscribe();
  }, [enabled, subscribe, subscriptionId, unsubscribe]);

  return {
    data: orderBookData,
    loading: enabled && !!subscription && subscription.lastUpdate === 0,
    error: lastError,
    lastUpdate: subscription?.lastUpdate || 0,
    subscribe,
    unsubscribe,
    isSubscribed: enabled && !!subscription
  };
};

// Combined hook for using all data types
export const useMarketData = (
  symbol: string,
  exchange: string,
  dataTypes: DataType[],
  providerId?: string,
  dashboardId: string = 'default',
  widgetId: string = 'default'
) => {
  const candles = useCandles(
    symbol,
    exchange,
    providerId,
    dashboardId,
    `${widgetId}-candles`,
    dataTypes.includes('candles')
  );

  const trades = useTrades(
    symbol,
    exchange,
    providerId,
    dashboardId,
    `${widgetId}-trades`,
    dataTypes.includes('trades')
  );

  const orderbook = useOrderBook(
    symbol,
    exchange,
    providerId,
    dashboardId,
    `${widgetId}-orderbook`,
    dataTypes.includes('orderbook')
  );

  const loading = (dataTypes.includes('candles') && candles.loading) ||
                  (dataTypes.includes('trades') && trades.loading) ||
                  (dataTypes.includes('orderbook') && orderbook.loading);

  const error = candles.error || trades.error || orderbook.error;

  const lastUpdate = Math.max(
    dataTypes.includes('candles') ? candles.lastUpdate : 0,
    dataTypes.includes('trades') ? trades.lastUpdate : 0,
    dataTypes.includes('orderbook') ? orderbook.lastUpdate : 0
  );

  return {
    candles: dataTypes.includes('candles') ? candles : null,
    trades: dataTypes.includes('trades') ? trades : null,
    orderbook: dataTypes.includes('orderbook') ? orderbook : null,
    loading,
    error,
    lastUpdate
  };
};

// Hook for getting list of providers
export const useDataProviders = () => {
  const {
    providers,
    activeProviderId,
    setActiveProvider,
    addProvider,
    removeProvider,
    loading
  } = useDataProviderStore();

  const providerList = useMemo(() => Object.values(providers), [providers]);
  const activeProvider = activeProviderId ? providers[activeProviderId] : null;

  return {
    providers: providerList,
    activeProvider,
    activeProviderId,
    setActiveProvider,
    addProvider,
    removeProvider,
    loading
  };
};

// Hook for getting connection information
export const useConnectionStats = () => {
  const {
    activeSubscriptions,
    forceCloseSubscription
  } = useDataProviderStore();

  const stats = useMemo(() => {
    const subscriptionList = Object.entries(activeSubscriptions).map(([id, subscription]) => ({
      id,
      ...subscription
    }));

    return {
      total: subscriptionList.length,
      connected: subscriptionList.filter(s => s.isActive && !s.isFallback && s.lastUpdate !== 0).length,
      connecting: subscriptionList.filter(s => s.isActive && s.lastUpdate === 0).length,
      error: 0,
      disconnected: subscriptionList.filter(s => !s.isActive).length,
      totalSubscriptions: subscriptionList.length,
      connections: subscriptionList,
      subscriptions: subscriptionList
    };
  }, [activeSubscriptions]);

  return {
    ...stats,
    closeConnection: forceCloseSubscription
  };
};

// Hook for checking exchange availability
export const useExchangeSupport = (exchangeId: string) => {
  const { providers } = useDataProviderStore();

  return useMemo(() => {
    const supportingProviders = Object.values(providers).filter(provider => {
      if (provider.type === 'ccxt-server') {
        return provider.exchanges.includes('*') || provider.exchanges.includes(exchangeId);
      }
      return false;
    });

    return {
      isSupported: supportingProviders.length > 0,
      providers: supportingProviders,
      count: supportingProviders.length
    };
  }, [providers, exchangeId]);
};
