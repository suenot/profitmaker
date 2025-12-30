import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataProvider, DataType, CCXTBrowserProvider, CCXTServerProvider, Timeframe, MarketType, WalletType } from '../../types/dataProviders';
import { getCCXT, getCCXTPro } from '../utils/ccxtUtils';
import { useUserStore } from '../userStore';
import { getAccountForExchange, convertAccountForProvider, createExchangeInstance } from '../utils/providerUtils';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../utils/exchangeLimits';

// ============================================================================
// Helper functions to reduce code duplication
// ============================================================================

/**
 * Sets defaultType option on CCXT exchange instance based on wallet/market type
 */
const setDefaultType = (exchangeInstance: any, walletType: WalletType | MarketType): void => {
  exchangeInstance.options = exchangeInstance.options || {};

  switch (walletType) {
    case 'futures':
      exchangeInstance.options['defaultType'] = 'future';
      break;
    case 'margin':
      exchangeInstance.options['defaultType'] = 'margin';
      break;
    case 'spot':
      exchangeInstance.options['defaultType'] = 'spot';
      break;
    // 'funding' and 'trading' don't need defaultType setting
  }
};

/**
 * Transforms CCXT balance response to our internal format
 */
const transformBalanceData = (balanceData: any): {
  timestamp: number;
  balances: Array<{ currency: string; free: number; used: number; total: number }>;
  info: any;
} => {
  const balances = Object.entries(balanceData)
    .filter(([currency, data]: [string, any]) =>
      currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' &&
      data && typeof data === 'object' && (data.total > 0 || data.free > 0 || data.used > 0)
    )
    .map(([currency, data]: [string, any]) => ({
      currency,
      free: data.free || 0,
      used: data.used || 0,
      total: data.total || 0
    }));

  return {
    timestamp: balanceData.timestamp || Date.now(),
    balances,
    info: balanceData.info
  };
};

/**
 * Fetches Bybit funding balance using specific API endpoint
 */
const fetchBybitFundingBalance = async (exchangeInstance: any): Promise<any | null> => {
  try {
    const allBalanceResponse = await exchangeInstance.privateGetV5AssetBalanceAllBalance();
    console.log(`💰 [Balance] Got Bybit funding balance:`, allBalanceResponse);

    const balanceData: any = { info: allBalanceResponse };

    if (allBalanceResponse?.result?.list) {
      allBalanceResponse.result.list.forEach((account: any) => {
        if (account.accountType === 'FUNDING' && account.coin) {
          account.coin.forEach((coinData: any) => {
            if (coinData.walletBalance && parseFloat(coinData.walletBalance) > 0) {
              const currency = coinData.coin;
              balanceData[currency] = {
                free: parseFloat(coinData.walletBalance || '0'),
                used: 0,
                total: parseFloat(coinData.walletBalance || '0')
              };
            }
          });
        }
      });
    }

    return balanceData;
  } catch (error: any) {
    console.warn(`⚠️ [Balance] Bybit funding balance failed:`, error.message);
    return null;
  }
};

/**
 * Fetches funding wallet balance for various exchanges
 */
const fetchFundingBalance = async (
  exchangeInstance: any,
  exchange: string
): Promise<any | null> => {
  const exchangeLower = exchange.toLowerCase();

  // Try Bybit-specific endpoint first
  if (exchangeLower === 'bybit') {
    const bybitBalance = await fetchBybitFundingBalance(exchangeInstance);
    if (bybitBalance) return bybitBalance;

    // Fallback to generic funding fetch
    try {
      return await exchangeInstance.fetchBalance({ type: 'funding' });
    } catch (error: any) {
      console.warn(`⚠️ [Balance] Bybit generic funding failed:`, error.message);
    }

    // Try fetchFundingBalance if available
    if (exchangeInstance.has?.fetchFundingBalance) {
      try {
        return await exchangeInstance.fetchFundingBalance();
      } catch (error: any) {
        console.error(`❌ [Balance] Both Bybit funding methods failed:`, error.message);
      }
    }
    return null;
  }

  // For other exchanges, try fetchFundingBalance
  if (exchangeInstance.has?.fetchFundingBalance) {
    try {
      return await exchangeInstance.fetchFundingBalance();
    } catch (error: any) {
      console.warn(`⚠️ [Balance] fetchFundingBalance failed for ${exchange}:`, error.message);
      return null;
    }
  }

  // Try generic funding type parameter
  try {
    return await exchangeInstance.fetchBalance({ type: 'funding' });
  } catch (error: any) {
    console.warn(`⚠️ [Balance] Funding balance not supported for ${exchange}:`, error.message);
    return null;
  }
};

// ============================================================================

export interface FetchingActions {
  startDataFetching: (subscriptionKey: string) => Promise<void>;
  stopDataFetching: (subscriptionKey: string) => void;
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  fetchBalance: (accountId: string, walletType: WalletType) => Promise<void>;
}

export const createFetchingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  FetchingActions
> = (set, get) => ({
  // Internal data flow management functions
  startDataFetching: async (subscriptionKey: string): Promise<void> => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || subscription.isActive) {
      return;
    }

    const { exchange, symbol, dataType, timeframe, market } = subscription.key;
    
    // NEW: Get provider for specific exchange (not just active provider)
    let provider: DataProvider | null = null;
    
    if (subscription.providerId) {
      // Use specific provider if set
      provider = get().providers[subscription.providerId];
    } else {
      // Auto-select optimal provider for this exchange
      provider = get().getProviderForExchange(exchange);
      
      // Save selected provider to subscription
      if (provider) {
        set(state => {
          if (state.activeSubscriptions[subscriptionKey]) {
            state.activeSubscriptions[subscriptionKey].providerId = provider!.id;
          }
        });
      }
    }
    
    if (!provider) {
      console.error(`❌ No suitable provider found for exchange ${exchange} (subscription ${subscriptionKey})`);
      return;
    }

    console.log(`🚀 Starting data fetching for ${subscriptionKey} using ${subscription.method} method`);

    set(state => {
      state.activeSubscriptions[subscriptionKey].isActive = true;
    });

    try {
      if (subscription.method === 'websocket') {
        await get().startWebSocketFetching(exchange, symbol, dataType, provider, timeframe, market);
      } else {
        await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      }
    } catch (error) {
      console.error(`❌ Failed to start data fetching for ${subscriptionKey}:`, error);
      set(state => {
        state.activeSubscriptions[subscriptionKey].isActive = false;
      });
    }
  },

  stopDataFetching: (subscriptionKey: string) => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || !subscription.isActive) {
      return;
    }

    console.log(`🛑 Stopping data fetching for ${subscriptionKey}`);

    // Stop WebSocket connection
    if (subscription.wsConnection) {
      subscription.wsConnection.close();
      console.log(`🔌 WebSocket connection closed for ${subscriptionKey}`);
    }

    // Stop REST cycle
    if (subscription.intervalId) {
      clearInterval(subscription.intervalId);
      console.log(`⏰ REST interval cleared for ${subscriptionKey}`);
    }

    set(state => {
      state.activeSubscriptions[subscriptionKey].isActive = false;
      delete state.activeSubscriptions[subscriptionKey].intervalId;
      delete state.activeSubscriptions[subscriptionKey].wsConnection;
    });
  },

  // Start WebSocket data fetching via CCXT Pro
  startWebSocketFetching: async (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      console.warn(`⚠️ WebSocket not supported for provider type ${provider.type}`);
      return;
    }

    const ccxtPro = getCCXTPro();
    if (!ccxtPro) {
      console.warn(`⚠️ CCXT Pro unavailable, switching to REST`);
      await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      return;
    }

    try {
      // Use appropriate provider for proper instance management
      let exchangeInstance: any;
      if (provider.type === 'ccxt-browser') {
        const { createCCXTBrowserProvider } = await import('../providers/ccxtBrowserProvider');
        const ccxtProvider = createCCXTBrowserProvider(provider);
        exchangeInstance = await ccxtProvider.getWebSocketInstance(exchange, market, false);
      } else if (provider.type === 'ccxt-server') {
        const { createCCXTServerProvider } = await import('../providers/ccxtServerProvider');
        const ccxtProvider = createCCXTServerProvider(provider);
        exchangeInstance = await ccxtProvider.getWebSocketInstance(exchange, market, false);
      } else {
        // Fallback for other provider types
        exchangeInstance = createExchangeInstance(exchange, provider, ccxtPro);
      }
      
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);

      // CCXT Pro supports WebSocket by default for all major exchanges
      console.log(`📡 Starting CCXT Pro WebSocket stream: ${exchange} ${symbol} ${dataType}`);
      
      // Check available methods in CCXT Pro
      console.log(`🔍 CCXT Pro ${exchange} available methods:`, Object.keys(exchangeInstance.has || {}));
      
      // Check WebSocket methods support in CCXT Pro
      let watchMethod: string;
      let hasSupport: boolean;

      switch (dataType) {
        case 'candles':
          watchMethod = 'watchOHLCV';
          hasSupport = !!exchangeInstance.has?.[watchMethod];
          break;
        case 'trades':
          watchMethod = 'watchTrades';
          hasSupport = !!exchangeInstance.has?.[watchMethod];
          break;
        case 'orderbook':
          // Use intelligent method selection for orderbook
          const methodSelection = get().selectOptimalOrderBookMethod(exchange, exchangeInstance);
          watchMethod = methodSelection.selectedMethod;
          hasSupport = methodSelection.selectedMethod !== 'fetchOrderBook'; // all except REST have WebSocket support
          
          console.log(`🎯 Optimal method selected for ${exchange} orderbook:`, {
            method: methodSelection.selectedMethod,
            reason: methodSelection.reason,
            isOptimal: methodSelection.isOptimal
          });
          
          // Save selected method in subscription for UI display
          set(state => {
            if (state.activeSubscriptions[subscriptionKey]) {
              state.activeSubscriptions[subscriptionKey].ccxtMethod = methodSelection.selectedMethod;
            }
          });
          break;
        case 'balance':
          watchMethod = 'watchBalance';
          hasSupport = !!exchangeInstance.has?.[watchMethod];
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      console.log(`🔍 CCXT Pro ${exchange} ${watchMethod} support:`, hasSupport);

      if (!hasSupport) {
        console.warn(`⚠️ CCXT Pro ${exchange} does not support ${watchMethod}, falling back to REST`);
        
        // Automatically switch to REST with fallback flag
        set(state => {
          if (state.activeSubscriptions[subscriptionKey]) {
            state.activeSubscriptions[subscriptionKey].method = 'rest';
            state.activeSubscriptions[subscriptionKey].isFallback = true; // IMPORTANT: Mark as fallback
          }
        });
        await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
        return;
      }

      // First load historical data via REST for candles
      if (dataType === 'candles') {
        try {
          console.log(`📊 Loading historical candles for ${exchange} ${symbol} ${timeframe} before WebSocket`);
          const ccxt = getCCXT();
          if (ccxt) {
            const restInstance = createExchangeInstance(exchange, provider, ccxt);
            // Get optimal limit for WebSocket pre-load
            const optimalLimit = getOHLCVLimit(exchange);
            logExchangeLimits(exchange, optimalLimit, 'ohlcv');
            const historicalCandles = await restInstance.fetchOHLCV(symbol, timeframe, undefined, optimalLimit);
            if (historicalCandles && historicalCandles.length > 0) {
              const formattedCandles = historicalCandles.map((c: any[]) => ({
                timestamp: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5]
              }));
              get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
              console.log(`✅ Loaded ${formattedCandles.length} historical candles`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load historical candles:`, error);
        }
      }

      // Start CCXT Pro WebSocket stream with infinite loop
      const startWebSocketStream = async () => {
        console.log(`🚀 Starting CCXT Pro WebSocket loop for ${exchange} ${symbol} ${dataType}`);
        
        while (true) {
          try {
            const subscription = get().activeSubscriptions[subscriptionKey];
            if (!subscription?.isActive) {
              console.log(`🛑 WebSocket loop stopped for ${subscriptionKey} - subscription inactive`);
              break;
            }

            switch (dataType) {
              case 'candles':
                const candles = await exchangeInstance.watchOHLCV(symbol, timeframe);
                if (candles && candles.length > 0) {
                  const formattedCandles = candles.map((c: any[]) => ({
                    timestamp: c[0],
                    open: c[1],
                    high: c[2],
                    low: c[3],
                    close: c[4],
                    volume: c[5]
                  }));
                  get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
                }
                break;
              case 'trades':
                // For WebSocket, we use watchTrades regardless of aggregate setting
                // The exchange itself determines if it returns aggregated or not
                const wsSubscription = get().activeSubscriptions[subscriptionKey];
                const isAggregated = wsSubscription?.config?.isAggregated ?? true;
                
                console.log(`📊 [WebSocket] Watching trades for ${exchange} ${symbol} (aggregated preference: ${isAggregated})`);
                
                const trades = await exchangeInstance.watchTrades(symbol);
                if (trades && trades.length > 0) {
                  get().updateTrades(exchange, symbol, trades, market);
                }
                break;
              case 'orderbook':
                // Get information about selected method
                const currentSubscription = get().activeSubscriptions[subscriptionKey];
                const selectedMethod = currentSubscription?.ccxtMethod || 'watchOrderBook';
                
                let orderbook;
                switch (selectedMethod) {
                  case 'watchOrderBookForSymbols':
                    // For multiple pairs (returns object with pairs)
                    const multiOrderbook = await exchangeInstance.watchOrderBookForSymbols([symbol]);
                    orderbook = multiOrderbook[symbol];
                    console.log(`📋 [OrderBook] (watchOrderBookForSymbols) received for ${exchange} ${symbol}`);
                    console.log(`🔍 [OrderBook] DEBUG multiOrderbook keys:`, Object.keys(multiOrderbook || {}));
                    console.log(`🔍 [OrderBook] DEBUG orderbook for ${symbol}:`, orderbook ? 'exists' : 'null/undefined');
                    break;
                  case 'watchOrderBook':
                  default:
                    // Standard full orderbook
                    orderbook = await exchangeInstance.watchOrderBook(symbol);
                    console.log(`📋 [OrderBook] (watchOrderBook) received for ${exchange} ${symbol}`);
                    console.log(`🔍 [OrderBook] DEBUG orderbook:`, orderbook ? 'exists' : 'null/undefined');
                    break;
                }
                
                console.log(`🔍 [OrderBook] DEBUG Final orderbook check:`, {
                  hasOrderbook: !!orderbook,
                  hasBids: orderbook?.bids?.length || 0,
                  hasAsks: orderbook?.asks?.length || 0,
                  timestamp: orderbook?.timestamp
                });
                
                if (orderbook) {
                  console.log(`📊 [OrderBook] Data sample:`, {
                    method: selectedMethod,
                    bids: orderbook.bids?.slice(0, 3),
                    asks: orderbook.asks?.slice(0, 3),
                    timestamp: orderbook.timestamp
                  });
                  console.log(`🚀 [OrderBook] DEBUG Calling updateOrderBook for ${exchange}:${market}:${symbol}`);
                  get().updateOrderBook(exchange, symbol, orderbook, market);
                } else {
                  console.warn(`⚠️ [OrderBook] DEBUG OrderBook is null/undefined, not calling updateOrderBook`);
                }
                break;
              case 'balance':
                setDefaultType(exchangeInstance, market);
                console.log(`💰 [Balance WS] Watching ${market} balance for ${exchange} with defaultType: ${exchangeInstance.options?.defaultType}`);

                const balanceData = await exchangeInstance.watchBalance();
                if (balanceData) {
                  const exchangeBalances = transformBalanceData(balanceData);
                  console.log(`💰 [Balance WS] Received balance update for ${exchange} (${market}):`, {
                    currencies: exchangeBalances.balances.length,
                    totalBalance: exchangeBalances.balances.reduce((sum, b) => sum + b.total, 0)
                  });
                  get().updateBalance(exchange, exchangeBalances, market);
                }
                break;
            }
          } catch (error) {
            console.error(`❌ CCXT Pro WebSocket error for ${subscriptionKey}:`, error);
            
            // On WebSocket error - switch to REST with fallback flag
            console.log(`🔄 Switching to REST fallback due to WebSocket error`);
            set(state => {
              if (state.activeSubscriptions[subscriptionKey]) {
                state.activeSubscriptions[subscriptionKey].method = 'rest';
                state.activeSubscriptions[subscriptionKey].isFallback = true;
              }
            });
            await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
            break;
          }
        }
      };

      // Start WebSocket stream in background
      startWebSocketStream().catch(error => {
        console.error(`❌ Failed to start CCXT Pro WebSocket for ${subscriptionKey}:`, error);
      });

    } catch (error) {
      console.error(`❌ Failed to start WebSocket for ${exchange} ${symbol} ${dataType}:`, error);
      throw error;
    }
  },

  // Start REST data fetching
  startRestFetching: async (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      console.warn(`⚠️ REST not supported for provider type ${provider.type}`);
      return;
    }

    const ccxt = getCCXT();
    if (!ccxt) return;

    try {
      // Use appropriate provider for proper instance management
      let exchangeInstance: any;
      if (provider.type === 'ccxt-browser') {
        const { createCCXTBrowserProvider } = await import('../providers/ccxtBrowserProvider');
        const ccxtProvider = createCCXTBrowserProvider(provider);
        exchangeInstance = await ccxtProvider.getMetadataInstance(exchange, market, false);
      } else if (provider.type === 'ccxt-server') {
        const { createCCXTServerProvider } = await import('../providers/ccxtServerProvider');
        const ccxtProvider = createCCXTServerProvider(provider);
        exchangeInstance = await ccxtProvider.getMetadataInstance(exchange, market, false);
      } else {
        // Fallback for other provider types
        exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      }

      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
      const interval = get().dataFetchSettings.restIntervals[dataType];

      console.log(`🔄 Starting REST polling: ${exchange} ${symbol} ${dataType} every ${interval}ms`);

      const fetchData = async () => {
        try {
          const subscription = get().activeSubscriptions[subscriptionKey];
          if (!subscription?.isActive) return;

          switch (dataType) {
            case 'candles':
              // Get optimal limit for REST candles
              const candleLimit = getOHLCVLimit(exchange);
              logExchangeLimits(exchange, candleLimit, 'ohlcv');
              const candles = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, candleLimit);
              if (candles && candles.length > 0) {
                const formattedCandles = candles.map((c: any[]) => ({
                  timestamp: c[0],
                  open: c[1],
                  high: c[2],
                  low: c[3],
                  close: c[4],
                  volume: c[5]
                }));
                get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
              }
              break;
            case 'trades':
              // Get subscription config for aggregate setting
              const subscription = get().activeSubscriptions[subscriptionKey];
              const isAggregated = subscription?.config?.isAggregated ?? true;
              const configLimit = subscription?.config?.tradesLimit;
              
              // Get optimal limit for REST trades, considering config
              const tradeLimit = configLimit ? Math.min(configLimit, getTradesLimit(exchange)) : getTradesLimit(exchange);
              logExchangeLimits(exchange, tradeLimit, 'trades');
              
              // Set fetchTradesMethod based on aggregated parameter
              const fetchTradesMethod = isAggregated 
                ? (exchange === 'binance' ? 'publicGetAggTrades' : undefined) // для binance используем agg, для остальных default
                : 'publicGetTrades'; // для non-aggregated используем publicGetTrades
              
              console.log(`📊 [REST] Using method: ${fetchTradesMethod || 'default'} for ${exchange} trades (aggregated: ${isAggregated})`);
              
              const trades = await exchangeInstance.fetchTrades(symbol, undefined, tradeLimit, 
                fetchTradesMethod ? { fetchTradesMethod } : {}
              );
              if (trades && trades.length > 0) {
                get().updateTrades(exchange, symbol, trades, market);
              }
              break;
            case 'orderbook':
              const orderbook = await exchangeInstance.fetchOrderBook(symbol);
              if (orderbook) {
                console.log(`📋 [OrderBook] Received via REST for ${exchange} ${symbol}:`, {
                  bids: orderbook.bids?.slice(0, 3),
                  asks: orderbook.asks?.slice(0, 3),
                  timestamp: orderbook.timestamp
                });
                get().updateOrderBook(exchange, symbol, orderbook, market);
              }
              break;
            case 'balance':
              // For balance requests, market parameter represents wallet type
              const walletType = market as WalletType; // spot, futures, margin, funding
              setDefaultType(exchangeInstance, walletType);
              console.log(`💰 [Balance] Fetching ${walletType} wallet balance for ${exchange} with defaultType: ${exchangeInstance.options?.defaultType}`);

              let restBalanceData;
              if (walletType === 'funding') {
                restBalanceData = await fetchFundingBalance(exchangeInstance, exchange);
              } else {
                try {
                  restBalanceData = await exchangeInstance.fetchBalance();
                } catch (balanceError: any) {
                  console.warn(`⚠️ [Balance] Failed to fetch ${walletType} balance for ${exchange}:`, balanceError.message);
                }
              }

              if (restBalanceData) {
                const exchangeBalances = transformBalanceData(restBalanceData);
                console.log(`💰 [Balance] Received ${walletType} wallet via REST for ${exchange}:`, {
                  currencies: exchangeBalances.balances.length,
                  totalBalance: exchangeBalances.balances.reduce((sum, b) => sum + b.total, 0)
                });
                get().updateBalance(exchange, exchangeBalances, walletType);
              }
              break;
          }
        } catch (error) {
          console.error(`❌ REST fetch error for ${subscriptionKey}:`, error);
          // On error continue attempts with increased interval
        }
      };

      // First request immediately
      await fetchData();

      // Start interval
      const intervalId = setInterval(fetchData, interval) as any;

      set(state => {
        if (state.activeSubscriptions[subscriptionKey]) {
          state.activeSubscriptions[subscriptionKey].intervalId = intervalId;
        }
      });

    } catch (error) {
      console.error(`❌ Failed to start REST polling for ${exchange} ${symbol} ${dataType}:`, error);
      throw error;
    }
  },

  fetchBalance: async (accountId: string, walletType: WalletType = 'trading') => {
    // Get account info from userStore
    const { useUserStore } = await import('../userStore');
    const userStore = useUserStore.getState();
    
    // Find account by ID
    let account: any = null;
    for (const user of userStore.users) {
      account = user.accounts.find(acc => acc.id === accountId);
      if (account) break;
    }
    
    if (!account) {
      console.error(`❌ [Balance] Account with ID ${accountId} not found`);
      return;
    }
    
    const exchange = account.exchange;
    
    console.log(`🔄 [Balance] Fetching balance for account ${accountId} (${exchange}:${walletType})`);
    
    try {
      const provider = get().getProviderForExchange(exchange);
      
      if (!provider) {
        console.error(`❌ [Balance] No provider found for exchange ${exchange}`);
        return;
      }
      
      if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
        console.error(`❌ [Balance] Provider type ${provider.type} not supported for balance fetching`);
        return;
      }
      
      const ccxt = getCCXT();
      if (!ccxt) {
        console.error('❌ [Balance] CCXT not available');
        return;
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      setDefaultType(exchangeInstance, walletType);
      console.log(`💰 [Balance] Fetching ${walletType} balance for account ${accountId} (${exchange}) with defaultType: ${exchangeInstance.options?.defaultType}`);

      let balanceData;
      if (walletType === 'funding') {
        balanceData = await fetchFundingBalance(exchangeInstance, exchange);
        if (!balanceData) {
          console.warn(`⚠️ [Balance] Funding balance not supported for account ${accountId} (${exchange})`);
          return;
        }
      } else {
        balanceData = await exchangeInstance.fetchBalance();
      }

      if (!balanceData) {
        console.warn(`⚠️ [Balance] No balance data received for account ${accountId} (${exchange}:${walletType})`);
        return;
      }

      const exchangeBalances = transformBalanceData(balanceData);
      console.log(`✅ [Balance] Fetched balance for account ${accountId} (${exchange}:${walletType}) (currencies: ${exchangeBalances.balances.length})`);
      
      // Update store
      get().updateBalance(accountId, exchangeBalances, walletType);
      
    } catch (error) {
      console.error(`❌ [Balance] Error fetching balance for account ${accountId}:`, error);
    }
  }
}); 