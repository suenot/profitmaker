import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, DataFetchMethod, Candle, Trade, OrderBook, Ticker, ExchangeBalances, ActiveSubscription, Timeframe, MarketType, WalletType, DataProvider } from '../../types/dataProviders';
import { getCCXT } from '../utils/ccxtUtils';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../utils/exchangeLimits';

// Helper function to create exchange instance based on provider type
const createExchangeInstanceForProvider = async (
  provider: DataProvider,
  exchange: string,
  market: MarketType = 'spot',
  sandbox: boolean = false
): Promise<any> => {
  if (provider.type === 'ccxt-browser') {
    const { createCCXTBrowserProvider } = await import('../providers/ccxtBrowserProvider');
    const ccxtProvider = createCCXTBrowserProvider(provider);
    return await ccxtProvider.getMetadataInstance(exchange, market, sandbox);
  } else if (provider.type === 'ccxt-server') {
    const { createCCXTServerProvider } = await import('../providers/ccxtServerProvider');
    const ccxtProvider = createCCXTServerProvider(provider);
    return await ccxtProvider.getMetadataInstance(exchange, market, sandbox);
  } else {
    throw new Error(`Unsupported provider type: ${provider.type}`);
  }
};

export interface DataActions {
  // Data fetch settings management
  setDataFetchMethod: (method: DataFetchMethod) => Promise<void>;
  setRestInterval: (dataType: DataType, interval: number) => void;
  
  // Data retrieval from store
  getCandles: (exchange: string, symbol: string, timeframe?: Timeframe, market?: MarketType) => Candle[];
  getTrades: (exchange: string, symbol: string, market?: MarketType) => Trade[];
  getOrderBook: (exchange: string, symbol: string, market?: MarketType) => OrderBook | null;
  getBalance: (accountId: string, walletType?: WalletType) => ExchangeBalances | null;
  getTicker: (exchange: string, symbol: string, market?: MarketType, maxAge?: number) => Ticker | null;
  getTickerWithRefresh: (exchange: string, symbol: string, market?: MarketType, forceRefresh?: boolean) => Promise<Ticker | null>;
  
  // REST data initialization for Chart widgets
  initializeChartData: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType) => Promise<Candle[]>;
  
  // REST data initialization for Trades widgets
  initializeTradesData: (exchange: string, symbol: string, market: MarketType, limit?: number, aggregated?: boolean) => Promise<Trade[]>;
  
  // REST data initialization for OrderBook widgets
  initializeOrderBookData: (exchange: string, symbol: string, market: MarketType) => Promise<OrderBook>;
  
  // REST data initialization for Balance widgets  
  initializeBalanceData: (accountId: string, walletType: WalletType) => Promise<ExchangeBalances>;
  
  // REST data initialization for Ticker widgets
  initializeTickerData: (exchange: string, symbol: string, market: MarketType) => Promise<Ticker>;
  
  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number) => Promise<Candle[]>;
  
  // User trading data methods
  fetchMyTrades: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<Trade[]>;
  fetchOrders: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<any[]>;
  fetchOpenOrders: (accountId: string, symbol?: string) => Promise<any[]>;
  fetchPositions: (accountId: string, symbols?: string[]) => Promise<any[]>;
  
  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => void;
  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market?: MarketType) => void;
  
  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];
}

export const createDataActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataActions
> = (set, get) => ({
  // Data fetch settings management
  setDataFetchMethod: async (method: DataFetchMethod) => {
    const oldMethod = get().dataFetchSettings.method;
    
    // First update settings
    set(state => {
      state.dataFetchSettings.method = method;
    });
    
    
    // When method changes - restart all active subscriptions
    if (oldMethod !== method) {
      const activeKeys = Object.keys(get().activeSubscriptions).filter(key => 
        get().activeSubscriptions[key].isActive
      );
      
      
      // Stop all active subscriptions
      activeKeys.forEach(key => {
        get().stopDataFetching(key);
      });
      
      // Update method in subscriptions
      set(state => {
        activeKeys.forEach(key => {
          if (state.activeSubscriptions[key]) {
            state.activeSubscriptions[key].method = method;
          }
        });
      });
      
      // Wait a bit for stopping to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Restart subscriptions with new method
      for (const key of activeKeys) {
        const subscription = get().activeSubscriptions[key];
        if (subscription) {
          await get().startDataFetching(key);
        }
      }
    }
  },

  setRestInterval: (dataType: DataType, interval: number) => {
    set(state => {
      state.dataFetchSettings.restIntervals[dataType] = interval;
      
      // Restart REST subscriptions for this data type
      Object.keys(state.activeSubscriptions).forEach(key => {
        const subscription = state.activeSubscriptions[key];
        if (subscription.key.dataType === dataType && subscription.method === 'rest' && subscription.isActive) {
          get().stopDataFetching(key);
          get().startDataFetching(key);
        }
      });
    });
  },

  // Data retrieval from store
  getCandles: (exchange: string, symbol: string, timeframe: Timeframe = '1m', market: MarketType = 'spot'): Candle[] => {
    const state = get();
    return state.marketData.candles[exchange]?.[market]?.[symbol]?.[timeframe] || [];
  },

  getTrades: (exchange: string, symbol: string, market: MarketType = 'spot'): Trade[] => {
    const state = get();
    return state.marketData.trades[exchange]?.[market]?.[symbol] || [];
  },

  getOrderBook: (exchange: string, symbol: string, market: MarketType = 'spot'): OrderBook | null => {
    const state = get();
    return state.marketData.orderbook[exchange]?.[market]?.[symbol] || null;
  },

  getBalance: (accountId: string, walletType?: WalletType): ExchangeBalances | null => {
    const state = get();
    const effectiveWalletType = walletType || 'trading';
    return state.marketData.balance[accountId]?.[effectiveWalletType] || null;
  },

  getTicker: (exchange: string, symbol: string, market: MarketType = 'spot', maxAge = 600000): Ticker | null => {
    const state = get();
    const tickerData = state.marketData.ticker[exchange]?.[market]?.[symbol];

    if (!tickerData) {
      return null;
    }

    const now = Date.now();
    const age = now - tickerData.lastUpdate;

    if (age > maxAge) {
      return null;
    }

    return {
      symbol: tickerData.symbol,
      timestamp: tickerData.timestamp,
      bid: tickerData.bid,
      ask: tickerData.ask,
      last: tickerData.last,
      close: tickerData.close,
      midPrice: tickerData.midPrice
    };
  },

  getTickerWithRefresh: async (exchange: string, symbol: string, market = 'spot' as MarketType, forceRefresh = false): Promise<Ticker | null> => {
    const maxAge = 600000; // 10 minutes

    // If not forced refresh, check if we have valid cached data
    if (!forceRefresh) {
      const cached = get().getTicker(exchange, symbol, market, maxAge);
      if (cached) {
        return cached;
      }
    }

    try {
      const ticker = await get().initializeTickerData(exchange, symbol, market);
      return ticker;
    } catch (error) {
      console.error(`[TickerWithRefresh] Failed to fetch ticker for ${exchange}:${market}:${symbol}:`, error);

      // On error, return cached data even if expired (better than nothing)
      const cached = get().getTicker(exchange, symbol, market, Infinity);
      return cached;
    }
  },

  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    let eventType: 'initial_load' | 'new_candles' | 'update_last_candle' = 'new_candles';
    let eventData: any = {};

    set(state => {
      if (!state.marketData.candles[exchange]) {
        state.marketData.candles[exchange] = {};
      }
      if (!state.marketData.candles[exchange][market]) {
        state.marketData.candles[exchange][market] = {};
      }
      if (!state.marketData.candles[exchange][market][symbol]) {
        state.marketData.candles[exchange][market][symbol] = {};
      }
      
      const existing = state.marketData.candles[exchange][market][symbol][timeframe] || [];
      
      if (existing.length === 0) {
        // If no data - this is first load (REST snapshot)
        state.marketData.candles[exchange][market][symbol][timeframe] = candles;
        eventType = 'initial_load';
        eventData = {
          totalCandles: candles.length,
          newCandles: candles
        };
      } else {
        // Have data - merge with existing (WebSocket updates)
        const candleMap = new Map<number, Candle>();
        
        // Add existing candles
        existing.forEach(candle => {
          candleMap.set(candle.timestamp, candle);
        });
        
        // Determine update type
        const lastExistingTime = existing[existing.length - 1]?.timestamp || 0;
        const newCandlesCount = candles.filter(c => c.timestamp > lastExistingTime).length;
        const hasUpdatedLastCandle = candles.some(c => c.timestamp === lastExistingTime);
        
        // Update/add new candles
        candles.forEach(candle => {
          candleMap.set(candle.timestamp, candle);
        });
        
        // Sort by time and save
        const mergedCandles = Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        state.marketData.candles[exchange][market][symbol][timeframe] = mergedCandles;
        
        // Determine event type for Chart widgets
        if (newCandlesCount > 0) {
          eventType = 'new_candles';
          eventData = {
            newCandlesCount,
            newCandles: candles.filter(c => c.timestamp > lastExistingTime),
            totalCandles: mergedCandles.length
          };
        } else if (hasUpdatedLastCandle) {
          eventType = 'update_last_candle';
          eventData = {
            lastCandle: candles.find(c => c.timestamp === lastExistingTime),
            totalCandles: mergedCandles.length
          };
        }
      }
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'candles', timeframe, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });

    // Emit event for Chart widgets after store update
    get().emitChartUpdateEvent({
      type: eventType,
      exchange,
      symbol,
      timeframe,
      market,
      data: eventData,
      timestamp: Date.now()
    });
  },

  updateTrades: (exchange: string, symbol: string, trades: Trade[], market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.trades[exchange]) {
        state.marketData.trades[exchange] = {};
      }
      if (!state.marketData.trades[exchange][market]) {
        state.marketData.trades[exchange][market] = {};
      }
      
      // For trades add new trades to existing (maximum 1000)
      const existing = state.marketData.trades[exchange][market][symbol] || [];
      const combined = [...existing, ...trades];
      state.marketData.trades[exchange][market][symbol] = combined.slice(-1000); // Keep last 1000
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'trades', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.orderbook[exchange]) {
        state.marketData.orderbook[exchange] = {};
      }
      if (!state.marketData.orderbook[exchange][market]) {
        state.marketData.orderbook[exchange][market] = {};
      }
      state.marketData.orderbook[exchange][market][symbol] = orderbook;

      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'orderbook', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => {
    const effectiveWalletType = walletType || 'trading';

    set(state => {
      if (!state.marketData.balance[accountId]) {
        state.marketData.balance[accountId] = {};
      }
      state.marketData.balance[accountId][effectiveWalletType] = balance;

      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey('', accountId, 'balance', undefined, effectiveWalletType as MarketType);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.ticker[exchange]) {
        state.marketData.ticker[exchange] = {};
      }
      if (!state.marketData.ticker[exchange][market]) {
        state.marketData.ticker[exchange][market] = {};
      }
      
      // Add lastUpdate timestamp for caching
      state.marketData.ticker[exchange][market][symbol] = {
        ...ticker,
        lastUpdate: Date.now()
      };

      // Update last update timestamp for subscription
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'ticker', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot'): string => {
    let key = `${exchange}:${market}:${symbol}:${dataType}`;
    if (dataType === 'candles' && timeframe) {
      key += `:${timeframe}`;
    }
    return key;
  },

  getActiveSubscriptionsList: (): ActiveSubscription[] => {
    return Object.values(get().activeSubscriptions);
  },

  // REST data initialization for Chart widgets
  initializeChartData: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType): Promise<Candle[]> => {
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
        throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for historical data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);

      // Get optimal limit for this exchange
      const optimalLimit = getOHLCVLimit(exchange);
      logExchangeLimits(exchange, optimalLimit, 'ohlcv');

      // Load historical data with optimal limit
      const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, optimalLimit);

      if (!ohlcvData || ohlcvData.length === 0) {
        throw new Error('No data received from exchange');
      }

      // Convert to Candle format
      const candles: Candle[] = ohlcvData.map((c: any[]) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }));

      // DO NOT save to store - return directly for chart
      return candles;

    } catch (error) {
      console.error(`❌ [initializeChartData] Failed to load data:`, error);
      throw error;
    }
  },

  // REST data initialization for Trades widgets
  initializeTradesData: async (exchange: string, symbol: string, market: MarketType, limit: number = 500, aggregated: boolean = true): Promise<Trade[]> => {
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
        throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for trades data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);

      // Set fetchTradesMethod based on aggregated parameter
      const fetchTradesMethod = aggregated
        ? (exchange === 'binance' ? 'publicGetAggTrades' : 'fetchTrades') // для binance используем agg, для остальных стандартный
        : 'publicGetTrades'; // для non-aggregated всегда publicGetTrades

      // Get optimal limit for trades (but respect the parameter)
      const effectiveLimit = Math.min(limit, getTradesLimit(exchange));
      logExchangeLimits(exchange, effectiveLimit, 'trades');

      // Load trades with fetchTradesMethod parameter
      const tradesData = await exchangeInstance.fetchTrades(symbol, undefined, effectiveLimit, {
        fetchTradesMethod
      });

      if (!tradesData || tradesData.length === 0) {
        console.warn(`⚠️ [initializeTradesData] No trades received for ${exchange}:${symbol}`);
        return [];
      }

      // Save trades to store AND return them
      get().updateTrades(exchange, symbol, tradesData, market);

      return tradesData;

    } catch (error) {
      console.error(`❌ [initializeTradesData] Failed to load trades:`, error);
      throw error;
    }
  },

  // REST data initialization for OrderBook widgets
  initializeOrderBookData: async (exchange: string, symbol: string, market: MarketType): Promise<OrderBook> => {
    try {
      // Use CCXT for public market data (no API keys needed)
      const ccxt = getCCXT();

      if (!ccxt) {
        throw new Error('CCXT not available');
      }

      const ExchangeClass = ccxt[exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchange} not found in CCXT`);
      }

      // Create public instance without API keys
      let defaultType: string = market;
      if (exchange === 'bybit') {
        const bybitCategoryMap: Record<string, string> = {
          'spot': 'spot',
          'futures': 'linear',
          'swap': 'linear',
          'margin': 'spot',
          'options': 'option'
        };
        defaultType = bybitCategoryMap[market] || market;
      }

      const exchangeInstance = new ExchangeClass({
        sandbox: false,
        enableRateLimit: true,
        defaultType: defaultType,
      });

      // Wrap with request logger for debugging
      const { wrapExchangeWithLogger } = await import('../../utils/requestLogger');
      const loggedInstance = wrapExchangeWithLogger(exchangeInstance, exchange, 'public-orderbook');

      await loggedInstance.loadMarkets();

      // Load orderbook via REST
      const orderbookData = await loggedInstance.fetchOrderBook(symbol);

      if (!orderbookData) {
        throw new Error('No orderbook data received from exchange');
      }

      if (!orderbookData.bids || !orderbookData.asks ||
          !Array.isArray(orderbookData.bids) || !Array.isArray(orderbookData.asks)) {
        throw new Error('Invalid orderbook data format received');
      }

      // Save orderbook to store AND return it
      get().updateOrderBook(exchange, symbol, orderbookData, market);

      return orderbookData;

    } catch (error) {
      console.error(`❌ [OrderBook] Failed to load orderbook:`, error);
      throw error;
    }
  },

  // REST data initialization for Balance widgets
  initializeBalanceData: async (accountId: string, walletType: WalletType): Promise<ExchangeBalances> => {
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
      throw new Error(`Account with ID ${accountId} not found`);
    }

    const exchange = account.exchange;

    try {
      // Use ccxtAccountManager for account-specific data
      const { ccxtAccountManager } = await import('../utils/ccxtAccountManager');

      const config = {
        accountId: accountId,
        exchange: exchange,
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password || undefined,
        sandbox: account.sandbox || false,
        marketType: walletType // Use walletType as marketType for balance
      };

      const exchangeInstance = await ccxtAccountManager.getRegularInstance(config);

      // Set defaultType based on wallet type (CCXT best practice)
      if (walletType === 'futures') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'future';
      } else if (walletType === 'margin') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'margin';
      } else if (walletType === 'spot') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'spot';
      }

      // Use fetchBalance() for all types (CCXT recommended approach)
      let balanceData = await exchangeInstance.fetchBalance();

      // Try fetchFundingBalance() if supported for additional funding wallet data
      if (exchangeInstance.has?.fetchFundingBalance) {
        try {
          const fundingBalance = await exchangeInstance.fetchFundingBalance();
          // Merge funding balance into main balance if needed
          if (fundingBalance && typeof fundingBalance === 'object') {
            // Add funding balances to the main balance structure
            Object.entries(fundingBalance).forEach(([currency, data]: [string, any]) => {
              if (currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' &&
                  data && typeof data === 'object') {
                // If currency already exists, add funding amounts to it
                if (balanceData[currency]) {
                  balanceData[currency].funding = data;
                } else {
                  // Create new entry for funding-only currencies
                  balanceData[currency] = {
                    free: 0,
                    used: 0,
                    total: 0,
                    funding: data
                  };
                }
              }
            });
          }
        } catch (fundingError) {
          console.warn(`⚠️ [Balance Init] Could not fetch funding balance for account ${accountId} (${exchange}):`, fundingError.message);
        }
      }

      if (!balanceData) {
        throw new Error('No balance data received from exchange');
      }

      // Transform CCXT balance format to our format
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

      const exchangeBalances = {
        timestamp: balanceData.timestamp || Date.now(),
        balances,
        info: balanceData.info
      };

      // Save balance to store AND return it
      get().updateBalance(accountId, exchangeBalances, walletType);

      return exchangeBalances;

    } catch (error) {
      console.error(`❌ [Balance] Failed to load balance for account ${accountId}:`, error);
      throw error;
    }
  },

  // REST data initialization for Ticker widgets
  initializeTickerData: async (exchange: string, symbol: string, market: MarketType): Promise<Ticker> => {
    try {
      // Use active provider for this exchange
      const provider = get().getProviderForExchange(exchange);
      if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
        throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for ticker data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);

      // Load ticker via REST
      const tickerData = await exchangeInstance.fetchTicker(symbol);

      if (!tickerData) {
        throw new Error('No ticker data received from exchange');
      }

      // Transform CCXT ticker format to our format
      const ticker: Ticker = {
        symbol: tickerData.symbol,
        timestamp: tickerData.timestamp || Date.now(),
        bid: tickerData.bid || 0,
        ask: tickerData.ask || 0,
        last: tickerData.last,
        close: tickerData.close,
        midPrice: tickerData.bid && tickerData.ask ? (tickerData.bid + tickerData.ask) / 2 : undefined
      };

      // Save ticker to store AND return it
      get().updateTicker(exchange, symbol, ticker, market);

      return ticker;

    } catch (error) {
      console.error(`❌ [Ticker] Failed to load ticker for ${exchange}:${market}:${symbol}:`, error);
      throw error;
    }
  },

  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number): Promise<Candle[]> => {
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
        throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for historical data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);

      if (!exchangeInstance.markets) {
        console.warn(`⚠️ [loadHistoricalCandles] Markets not loaded for ${exchange}`);
      }

      // Get optimal limit for this exchange (use maximum allowed by exchange)
      const optimalLimit = getOHLCVLimit(exchange);
      logExchangeLimits(exchange, optimalLimit, 'ohlcv');

      // Calculate 'since' timestamp for CCXT (load data BEFORE beforeTimestamp)
      // We want data that comes BEFORE the given timestamp, so we need to calculate
      // how far back to go based on timeframe and limit

      // Simple timeframe to milliseconds conversion
      const timeframeToMs = (tf: string): number => {
        const unit = tf.slice(-1);
        const value = parseInt(tf.slice(0, -1)) || 1;
        switch (unit) {
          case 'm': return value * 60 * 1000;
          case 'h': return value * 60 * 60 * 1000;
          case 'd': return value * 24 * 60 * 60 * 1000;
          default: return 60 * 1000; // default 1 minute
        }
      };

      const timeframeMs = timeframeToMs(timeframe);
      const sinceTimestamp = beforeTimestamp - (optimalLimit * timeframeMs);

      // Load historical data with 'since' parameter (CCXT: fetchOHLCV(symbol, timeframe, since, limit))
      const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, sinceTimestamp, optimalLimit);

      if (!ohlcvData || ohlcvData.length === 0) {
        console.warn(`⚠️ [loadHistoricalCandles] No historical data received for ${exchange}:${market}:${symbol}:${timeframe} before ${new Date(beforeTimestamp).toISOString()}`);
        return [];
      }

      // Convert to Candle format and filter to only include data BEFORE beforeTimestamp
      const candles: Candle[] = ohlcvData
        .filter((c: any[]) => c[0] < beforeTimestamp) // Only candles before the given timestamp
        .map((c: any[]) => ({
          timestamp: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5]
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending

      // DO NOT save to store - return directly for chart infinite scroll
      return candles;

    } catch (error) {
      console.error(`❌ [loadHistoricalCandles] Failed to load historical data:`, error);
      throw error;
    }
  },

  // User trading data methods
  fetchMyTrades: async (accountId: string, symbol?: string, since?: number, limit?: number): Promise<Trade[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);

    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchMyTrades] ${error}`);
      throw new Error(error);
    }

    try {
      // Use CCXTAccountManager for better performance and consistency
      const { ccxtAccountManager } = await import('../utils/ccxtAccountManager');

      // Create account config
      const accountConfig = {
        accountId: account.id,
        exchange: account.exchange,
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false
      };

      const exchangeInstance = await ccxtAccountManager.getRegularInstance(accountConfig, 'spot');

      await exchangeInstance.loadMarkets();

      // Check if exchange supports fetchMyTrades
      if (!exchangeInstance.has.fetchMyTrades) {
        console.warn(`⚠️ [fetchMyTrades] Exchange ${account.exchange} does not support fetchMyTrades`);
        return [];
      }

      // Get supported markets for this exchange
      const supportedMarkets = await get().getMarketsForExchange(account.exchange);

      let allTrades: any[] = [];

      // Function to fetch trades for a specific market category
      const fetchTradesForMarket = async (marketCategory?: string) => {
        let marketTrades: any[] = [];

        // Set market category for Bybit and similar exchanges
        if (marketCategory && account.exchange === 'bybit') {
          // Map our market names to Bybit categories
          const bybitCategoryMap: Record<string, string> = {
            'spot': 'spot',
            'futures': 'linear',
            'swap': 'linear',
            'margin': 'spot',
            'options': 'option'
          };

          const bybitCategory = bybitCategoryMap[marketCategory];
          if (bybitCategory) {
            exchangeInstance.options = exchangeInstance.options || {};
            exchangeInstance.options.defaultType = bybitCategory;
          }
        }

        try {
          // Try to fetch trades for all symbols or specific symbol
          marketTrades = await exchangeInstance.fetchMyTrades(symbol, since, limit);
        } catch (error) {
          console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${marketCategory || 'default'} with symbol=${symbol}, error:`, error.message);

          // Some exchanges might require specific symbols, try to get popular trading pairs
          if (!symbol && account.exchange === 'bybit') {
            const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];

            for (const popularSymbol of popularSymbols) {
              try {
                const symbolTrades = await exchangeInstance.fetchMyTrades(popularSymbol, since, Math.min(limit || 100, 20));
                marketTrades.push(...symbolTrades);
              } catch (symbolError) {
                console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${popularSymbol} in ${marketCategory}:`, symbolError.message);
              }
            }
          }
        }

        return marketTrades;
      };

      // Fetch trades for all supported markets
      if (supportedMarkets.length > 0) {
        for (const market of supportedMarkets) {
          try {
            const marketTrades = await fetchTradesForMarket(market);
            allTrades.push(...marketTrades);
          } catch (error) {
            console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${market} market:`, error.message);
            // Continue with other markets
          }
        }
      } else {
        // Fallback: fetch without specific market category
        const defaultTrades = await fetchTradesForMarket();
        allTrades.push(...defaultTrades);
      }

      // Remove duplicates and sort by timestamp
      const uniqueTrades = allTrades.filter((trade, index, self) =>
        index === self.findIndex(t => t.id === trade.id)
      ).sort((a, b) => b.timestamp - a.timestamp);

      return uniqueTrades.map((trade: any) => ({
        id: trade.id,
        timestamp: trade.timestamp,
        symbol: trade.symbol,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        cost: trade.cost,
        fee: trade.fee,
        info: trade.info
      }));

    } catch (error) {
      console.error(`❌ [fetchMyTrades] Failed to load trades for account ${accountId}:`, error);
      console.error(`❌ [fetchMyTrades] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchOrders: async (accountId: string, symbol?: string, since?: number, limit?: number): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);

    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchOrders] ${error}`);
      throw new Error(error);
    }

    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }

      const ExchangeClass = ccxt[account.exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${account.exchange} not found in CCXT`);
      }

      // Get supported markets for this exchange
      const supportedMarkets = await get().getMarketsForExchange(account.exchange);

      let allOrders: any[] = [];

      // Function to fetch orders for a specific market category
      const fetchOrdersForMarket = async (marketCategory?: string) => {
        let marketOrders: any[] = [];
        const marketLabel = marketCategory || 'default';

        // Create account config
        const accountConfig = {
          accountId: account.id,
          exchange: account.exchange,
          apiKey: account.key,
          secret: account.privateKey,
          password: account.password,
          sandbox: false
        };

        // Get exchange instance through account manager
        const { ccxtAccountManager } = await import('../utils/ccxtAccountManager');
        const exchangeInstance = await ccxtAccountManager.getRegularInstance(accountConfig, marketCategory || 'spot');

        // Try fetchOrders first
        if (exchangeInstance.has.fetchOrders) {
          try {
            const orders = await exchangeInstance.fetchOrders(symbol, since, limit);
            marketOrders = orders;
          } catch (error) {
            console.warn(`⚠️ [fetchOrders] fetchOrders failed for ${account.exchange} (${marketLabel}):`, error.message);

            // Fallback to alternative methods
            if (exchangeInstance.has.fetchOpenOrders || exchangeInstance.has.fetchClosedOrders) {
              // Fetch open orders
              if (exchangeInstance.has.fetchOpenOrders) {
                try {
                  const openOrders = await exchangeInstance.fetchOpenOrders(symbol);
                  marketOrders.push(...openOrders);
                } catch (openError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch open orders for ${marketLabel}:`, openError.message);
                }
              }

              // Fetch closed orders
              if (exchangeInstance.has.fetchClosedOrders) {
                try {
                  const closedOrders = await exchangeInstance.fetchClosedOrders(symbol, since, limit);
                  marketOrders.push(...closedOrders);
                } catch (closedError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch closed orders for ${marketLabel}:`, closedError.message);
                }
              }

              // Fetch canceled orders
              if (exchangeInstance.has.fetchCanceledOrders) {
                try {
                  const canceledOrders = await exchangeInstance.fetchCanceledOrders(symbol, since, limit);
                  marketOrders.push(...canceledOrders);
                } catch (canceledError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch canceled orders for ${marketLabel}:`, canceledError.message);
                }
              }
            }
          }
        } else {
          // Use alternative methods if fetchOrders not supported
          if (exchangeInstance.has.fetchOpenOrders || exchangeInstance.has.fetchClosedOrders) {
            // Fetch open orders
            if (exchangeInstance.has.fetchOpenOrders) {
              try {
                const openOrders = await exchangeInstance.fetchOpenOrders(symbol);
                marketOrders.push(...openOrders);
              } catch (openError) {
                console.warn(`⚠️ [fetchOrders] Failed to fetch open orders for ${marketLabel}:`, openError.message);
              }
            }

            // Fetch closed orders
            if (exchangeInstance.has.fetchClosedOrders) {
              try {
                const closedOrders = await exchangeInstance.fetchClosedOrders(symbol, since, limit);
                marketOrders.push(...closedOrders);
              } catch (closedError) {
                console.warn(`⚠️ [fetchOrders] Failed to fetch closed orders for ${marketLabel}:`, closedError.message);
              }
            }
          }
        }

        return marketOrders;
      };

      // Fetch orders for all supported markets
      if (supportedMarkets.length > 0) {
        for (const market of supportedMarkets) {
          try {
            const marketOrders = await fetchOrdersForMarket(market);
            allOrders.push(...marketOrders);
          } catch (error) {
            console.warn(`⚠️ [fetchOrders] Failed to fetch orders for ${market} market:`, error.message);
            // Continue with other markets
          }
        }
      } else {
        // Fallback: fetch without specific market category
        const defaultOrders = await fetchOrdersForMarket();
        allOrders.push(...defaultOrders);
      }

      // Sort by timestamp (newest first) and remove duplicates
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex(o => o.id === order.id)
      ).sort((a, b) => b.timestamp - a.timestamp);

      return uniqueOrders;

    } catch (error) {
      console.error(`❌ [fetchOrders] Failed to load orders for account ${accountId}:`, error);
      console.error(`❌ [fetchOrders] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchOpenOrders: async (accountId: string, symbol?: string): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();

    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);

    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchOpenOrders] ${error}`);
      throw new Error(error);
    }

    try {
      // Use CCXTAccountManager for better performance and consistency
      const { ccxtAccountManager } = await import('../utils/ccxtAccountManager');

      // Account configuration
      const accountConfig = {
        accountId: account.id,
        exchange: account.exchange,
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false
      };

      let allOrders: any[] = [];

      // OPTIMIZED APPROACH: Smart strategy for fetching orders
      if (account.exchange === 'bybit') {
        // For Bybit: Try to get orders for main categories in priority order
        const bybitCategories = ['linear', 'spot']; // linear covers futures+swap, spot covers spot+margin

        for (const category of bybitCategories) {
          try {
            const exchangeInstance = await ccxtAccountManager.getRegularInstance(
              accountConfig,
              category === 'linear' ? 'futures' : 'spot'
            );

            if (!exchangeInstance.has.fetchOpenOrders) {
              console.warn(`⚠️ [fetchOpenOrders] Bybit ${category} does not support fetchOpenOrders`);
              continue;
            }

            const orders = await exchangeInstance.fetchOpenOrders(symbol);
            allOrders.push(...orders);

            // If we got orders from linear, it likely covers most futures/swap orders
            // If we got orders from spot, it covers spot/margin orders

          } catch (error) {
            console.warn(`⚠️ [fetchOpenOrders] Failed to fetch from Bybit ${category}:`, error.message);
            console.error(`🔍 [fetchOpenOrders] Full error for ${category}:`, error);
            continue;
          }
        }
      } else {
        // For other exchanges: Use a more conservative approach
        // Try spot first (most universal), then futures if needed
        const exchangeCategories = ['spot', 'futures'];

        for (const category of exchangeCategories) {
          try {
            const exchangeInstance = await ccxtAccountManager.getRegularInstance(
              accountConfig,
              category
            );

            if (!exchangeInstance.has.fetchOpenOrders) {
              console.warn(`⚠️ [fetchOpenOrders] ${account.exchange} ${category} does not support fetchOpenOrders`);
              continue;
            }

            const orders = await exchangeInstance.fetchOpenOrders(symbol);
            allOrders.push(...orders);

          } catch (error) {
            console.warn(`⚠️ [fetchOpenOrders] Failed to fetch from ${account.exchange} ${category}:`, error.message);
            continue;
          }
        }
      }

      // Remove duplicates and sort by timestamp
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex(o => o.id === order.id)
      ).sort((a, b) => b.timestamp - a.timestamp);

      return uniqueOrders;

    } catch (error) {
      console.error(`❌ [fetchOpenOrders] Failed to load open orders for account ${accountId}:`, error);
      console.error(`❌ [fetchOpenOrders] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchPositions: async (accountId: string, symbols?: string[]): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);

    if (!account || !account.key || !account.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    try {
      // Get supported markets for this exchange (positions are usually in futures/swap markets)
      const supportedMarkets = await get().getMarketsForExchange(account.exchange);

      // Filter to position-supporting markets (futures, swap)
      const positionMarkets = supportedMarkets.filter(market =>
        market === 'futures' || market === 'swap'
      );

      let allPositions: any[] = [];

      // Use CCXTAccountManager for better performance and consistency
      const { ccxtAccountManager } = await import('../utils/ccxtAccountManager');

      // Account configuration
      const accountConfig = {
        accountId: account.id,
        exchange: account.exchange,
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false
      };

      // Function to fetch positions for a specific market category
      const fetchPositionsForMarket = async (marketCategory: string) => {
        try {
          // Get exchange instance for this market type
          const exchangeInstance = await ccxtAccountManager.getRegularInstance(
            accountConfig,
            marketCategory
          );

          // Check if exchange supports fetchPositions
          if (!exchangeInstance.has.fetchPositions) {
            console.warn(`⚠️ [fetchPositions] Exchange ${account.exchange} does not support fetchPositions for ${marketCategory}`);
            return [];
          }

          const marketPositions = await exchangeInstance.fetchPositions(symbols);

          return marketPositions;
        } catch (error) {
          console.warn(`⚠️ [fetchPositions] Failed to fetch positions for ${marketCategory}, error:`, error.message);
          return [];
        }
      };

      // Fetch positions for position-supporting markets
      if (positionMarkets.length > 0) {
        for (const market of positionMarkets) {
          try {
            const marketPositions = await fetchPositionsForMarket(market);
            allPositions.push(...marketPositions);
          } catch (error) {
            console.warn(`⚠️ [fetchPositions] Failed to fetch positions for ${market} market:`, error.message);
            // Continue with other markets
          }
        }
      } else {
        // Fallback: try futures market as default for positions
        const defaultPositions = await fetchPositionsForMarket('futures');
        allPositions.push(...defaultPositions);
      }

      // Remove duplicates and sort
      const uniquePositions = allPositions.filter((position, index, self) =>
        index === self.findIndex(p => p.symbol === position.symbol && p.side === position.side)
      );

      return uniquePositions;

    } catch (error) {
      console.error(`❌ [fetchPositions] Failed to load positions for account ${accountId}:`, error);
      throw error;
    }
  }
 });