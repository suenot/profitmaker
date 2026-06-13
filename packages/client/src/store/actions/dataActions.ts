import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, DataFetchMethod, Candle, Trade, OrderBook, Ticker, ExchangeBalances, ActiveSubscription, Timeframe, MarketType, WalletType, DataProvider } from '../../types/dataProviders';
import type { AccountRef } from '@profitmaker/types';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../utils/exchangeLimits';

// Create a server-side market-data instance (proxy) for public market data.
// Stage 2 routes every fetch through the ccxt-server provider.
const createExchangeInstanceForProvider = async (
  provider: DataProvider,
  exchange: string,
  market: MarketType = 'spot',
  sandbox: boolean = false
): Promise<any> => {
  if (provider.type !== 'ccxt-server') {
    throw new Error(`Unsupported provider type: ${provider.type}`);
  }
  const { createCCXTServerProvider } = await import('../providers/ccxtServerProvider');
  const ccxtProvider = createCCXTServerProvider(provider);
  return await ccxtProvider.getMetadataInstance(exchange, market, sandbox);
};

/**
 * Resolve a central-accounts auth reference for an account. No secrets cross to
 * the browser — only the credential id + access level travel; the server
 * resolves the decrypted keys under the caller's SSO identity. These are all
 * private reads, so callers pass want='read'.
 */
const resolveCredentials = (
  accountId: string,
  want: AccountRef['want'] = 'read',
): AccountRef | null => {
  if (!accountId) return null;
  return { accountId, want };
};

/** Get the server trading provider for an exchange, or null if unavailable. */
const getServerTradingProvider = async (exchange: string, get: () => DataProviderStore) => {
  const provider = get().getProviderForExchange(exchange);
  if (!provider || provider.type !== 'ccxt-server') return null;
  const { createCCXTServerProvider } = await import('../providers/ccxtServerProvider');
  return createCCXTServerProvider(provider);
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
  fetchLedger: (accountId: string, code?: string, since?: number, limit?: number) => Promise<any[]>;

  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => void;
  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market?: MarketType) => void;
  
  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, providerId?: string) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];
}

function updateMatchingSubscriptionTimestamps(
  activeSubscriptions: Record<string, ActiveSubscription>,
  exchange: string,
  symbol: string,
  dataType: DataType,
  timeframe: Timeframe | undefined,
  market: MarketType
) {
  const now = Date.now();
  Object.values(activeSubscriptions).forEach((subscription) => {
    if (
      subscription.key.exchange === exchange &&
      subscription.key.symbol === symbol &&
      subscription.key.dataType === dataType &&
      subscription.key.timeframe === timeframe &&
      subscription.key.market === market
    ) {
      subscription.lastUpdate = now;
    }
  });
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
    
    console.log(`🔄 Data fetch method changed from ${oldMethod} to ${method}`);
    
    // When method changes - restart all active subscriptions
    if (oldMethod !== method) {
      const activeKeys = Object.keys(get().activeSubscriptions).filter(key => 
        get().activeSubscriptions[key].isActive
      );
      
      console.log(`🔄 Restarting ${activeKeys.length} active subscriptions with new method: ${method}`);
      
      // Stop all active subscriptions
      activeKeys.forEach(key => {
        console.log(`🛑 Stopping subscription ${key} for method change`);
        get().stopDataFetching(key);
      });
      
      // Update method in subscriptions
      set(state => {
        activeKeys.forEach(key => {
          if (state.activeSubscriptions[key]) {
            state.activeSubscriptions[key].method = method;
            console.log(`🔄 Updated method for subscription ${key} to ${method}`);
          }
        });
      });
      
      // Wait a bit for stopping to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Restart subscriptions with new method
      for (const key of activeKeys) {
        const subscription = get().activeSubscriptions[key];
        if (subscription) {
          console.log(`🚀 Restarting subscription ${key} with method ${method}`);
          await get().startDataFetching(key);
        }
      }
      
      console.log(`✅ All subscriptions restarted with method: ${method}`);
    }
  },

  setRestInterval: (dataType: DataType, interval: number) => {
    set(state => {
      const oldInterval = state.dataFetchSettings.restIntervals[dataType];
      state.dataFetchSettings.restIntervals[dataType] = interval;
      console.log(`⏱️ REST interval for ${dataType} changed from ${oldInterval}ms to ${interval}ms`);
      
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
    const result = state.marketData.orderbook[exchange]?.[market]?.[symbol] || null;
    
    console.log(`🔍 [OrderBook] Requesting data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      hasExchange: !!state.marketData.orderbook[exchange],
      hasMarket: !!state.marketData.orderbook[exchange]?.[market],
      hasSymbol: !!state.marketData.orderbook[exchange]?.[market]?.[symbol],
      result: result,
      allExchanges: Object.keys(state.marketData.orderbook),
      fullOrderbookData: state.marketData.orderbook
    });
    
    return result;
  },

  getBalance: (accountId: string, walletType?: WalletType): ExchangeBalances | null => {
    const state = get();
    const effectiveWalletType = walletType || 'trading';
    const result = state.marketData.balance[accountId]?.[effectiveWalletType] || null;
    
    console.log(`💰 [Balance] Requesting data for account ${accountId}:${effectiveWalletType}:`, {
      accountId,
      walletType: effectiveWalletType,
      hasAccount: !!state.marketData.balance[accountId],
      hasWalletType: !!state.marketData.balance[accountId]?.[effectiveWalletType],
      result: result,
      allAccounts: Object.keys(state.marketData.balance)
    });
    
    return result;
  },

  getTicker: (exchange: string, symbol: string, market: MarketType = 'spot', maxAge = 600000): Ticker | null => {
    const state = get();
    const tickerData = state.marketData.ticker[exchange]?.[market]?.[symbol];
    
    if (!tickerData) {
      console.log(`🎯 [Ticker] No ticker data for ${exchange}:${market}:${symbol}`);
      return null;
    }
    
    const now = Date.now();
    const age = now - tickerData.lastUpdate;
    
    if (age > maxAge) {
      console.log(`⏰ [Ticker] Data is too old for ${exchange}:${market}:${symbol}, age: ${age}ms, maxAge: ${maxAge}ms`);
      return null;
    }
    
    console.log(`✅ [Ticker] Returning cached data for ${exchange}:${market}:${symbol}, age: ${age}ms`);
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
        console.log(`💾 [TickerWithRefresh] Using cached data for ${exchange}:${market}:${symbol}`);
        return cached;
      }
    }
    
    try {
      console.log(`🔄 [TickerWithRefresh] Fetching fresh data for ${exchange}:${market}:${symbol}, forceRefresh: ${forceRefresh}`);
      const ticker = await get().initializeTickerData(exchange, symbol, market);
      return ticker;
    } catch (error) {
      console.error(`❌ [TickerWithRefresh] Failed to fetch ticker for ${exchange}:${market}:${symbol}:`, error);
      
      // On error, return cached data even if expired (better than nothing)
      const cached = get().getTicker(exchange, symbol, market, Infinity);
      if (cached) {
        console.log(`🆘 [TickerWithRefresh] Returning expired cached data due to fetch error`);
        return cached;
      }
      
      return null;
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
        console.log(`📊 [updateCandles] Initial snapshot loaded: ${candles.length} candles for ${exchange}:${market}:${symbol}:${timeframe}`);
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
        
        console.log(`🔄 [updateCandles] WebSocket update: ${candles.length} new/updated candles, total: ${mergedCandles.length} for ${exchange}:${market}:${symbol}:${timeframe}, event: ${eventType}`);
      }
      
      updateMatchingSubscriptionTimestamps(state.activeSubscriptions, exchange, symbol, 'candles', timeframe, market);
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
      
      updateMatchingSubscriptionTimestamps(state.activeSubscriptions, exchange, symbol, 'trades', undefined, market);
    });
  },

  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market: MarketType = 'spot') => {
    console.log(`💾 [OrderBook] Saving data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      orderbook,
      hasBids: orderbook?.bids?.length || 0,
      hasAsks: orderbook?.asks?.length || 0,
      timestamp: orderbook?.timestamp
    });
    
    set(state => {
      if (!state.marketData.orderbook[exchange]) {
        state.marketData.orderbook[exchange] = {};
      }
      if (!state.marketData.orderbook[exchange][market]) {
        state.marketData.orderbook[exchange][market] = {};
      }
      state.marketData.orderbook[exchange][market][symbol] = orderbook;
      
      console.log(`✅ [OrderBook] Data saved to state:`, {
        exchange,
        market,
        symbol,
        savedSuccessfully: !!state.marketData.orderbook[exchange][market][symbol],
        allExchanges: Object.keys(state.marketData.orderbook)
      });
      
      updateMatchingSubscriptionTimestamps(state.activeSubscriptions, exchange, symbol, 'orderbook', undefined, market);
    });
  },

  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => {
    const effectiveWalletType = walletType || 'trading';
    console.log(`💰 [Balance] Saving data for account ${accountId}:${effectiveWalletType}:`, {
      accountId,
      walletType: effectiveWalletType,
      balance,
      balancesCount: balance.balances?.length || 0,
      timestamp: balance.timestamp
    });
    
    set(state => {
      if (!state.marketData.balance[accountId]) {
        state.marketData.balance[accountId] = {};
      }
      state.marketData.balance[accountId][effectiveWalletType] = balance;
      
      console.log(`✅ [Balance] Data saved to state:`, {
        accountId,
        walletType: effectiveWalletType,
        savedSuccessfully: !!state.marketData.balance[accountId][effectiveWalletType],
        allAccounts: Object.keys(state.marketData.balance)
      });
      
      updateMatchingSubscriptionTimestamps(state.activeSubscriptions, '', accountId, 'balance', undefined, effectiveWalletType as MarketType);
    });
  },

  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market: MarketType = 'spot') => {
    console.log(`🎯 [Ticker] Saving data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      ticker,
      bid: ticker.bid,
      ask: ticker.ask,
      midPrice: ticker.midPrice,
      timestamp: ticker.timestamp
    });
    
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
      
      console.log(`✅ [Ticker] Data saved to state:`, {
        exchange,
        market,
        symbol,
        savedSuccessfully: !!state.marketData.ticker[exchange][market][symbol],
        allExchanges: Object.keys(state.marketData.ticker)
      });
      
      updateMatchingSubscriptionTimestamps(state.activeSubscriptions, exchange, symbol, 'ticker', undefined, market);
    });
  },

  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot', providerId?: string): string => {
    let key = `${exchange}:${market}:${symbol}:${dataType}`;
    if (dataType === 'candles' && timeframe) {
      key += `:${timeframe}`;
    }
    if (providerId) {
      key += `:provider:${providerId}`;
    }
    return key;
  },

  getActiveSubscriptionsList: (): ActiveSubscription[] => {
    return Object.values(get().activeSubscriptions);
  },

  // REST data initialization for Chart widgets
  initializeChartData: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType): Promise<Candle[]> => {
    console.log(`🚀 [initializeChartData] Loading initial OHLCV data for ${exchange}:${market}:${symbol}:${timeframe}`);
    
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || provider.type !== 'ccxt-server') {
        throw new Error(`No suitable CCXT server provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for historical data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
      
      console.log(`🔍 [initializeChartData] Using ${provider.id} provider for ${exchange}:${market}`);
      
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
      
      console.log(`✅ [initializeChartData] Loaded ${candles.length} candles for ${exchange}:${market}:${symbol}:${timeframe}`);
      
      // DO NOT save to store - return directly for chart
      return candles;
      
    } catch (error) {
      console.error(`❌ [initializeChartData] Failed to load data:`, error);
      throw error;
    }
  },

  // REST data initialization for Trades widgets
  initializeTradesData: async (exchange: string, symbol: string, market: MarketType, limit: number = 500, aggregated: boolean = true): Promise<Trade[]> => {
    console.log(`🚀 [initializeTradesData] Loading initial trades for ${exchange}:${market}:${symbol} (limit: ${limit}, aggregated: ${aggregated})`);
    
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || provider.type !== 'ccxt-server') {
        throw new Error(`No suitable CCXT server provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for trades data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
      
      console.log(`🔍 [initializeTradesData] Using ${provider.id} provider for ${exchange}:${market}`);
      
      // Set fetchTradesMethod based on aggregated parameter
      const fetchTradesMethod = aggregated 
        ? (exchange === 'binance' ? 'publicGetAggTrades' : 'fetchTrades') // для binance используем agg, для остальных стандартный
        : 'publicGetTrades'; // для non-aggregated всегда publicGetTrades
      
      console.log(`📊 [initializeTradesData] Using method: ${fetchTradesMethod} for ${exchange}`);
      
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
      
      console.log(`✅ [initializeTradesData] Loaded ${tradesData.length} trades for ${exchange}:${market}:${symbol} (method: ${fetchTradesMethod})`);
      
      // Save trades to store AND return them
      get().updateTrades(exchange, symbol, tradesData, market);
      console.log(`💾 [initializeTradesData] Trades saved to store for ${exchange}:${market}:${symbol}`);
      
      return tradesData;
      
    } catch (error) {
      console.error(`❌ [initializeTradesData] Failed to load trades:`, error);
      throw error;
    }
  },

  // REST data initialization for OrderBook widgets
  initializeOrderBookData: async (exchange: string, symbol: string, market: MarketType): Promise<OrderBook> => {
    console.log(`🚀 [OrderBook] Loading initial orderbook for ${exchange}:${market}:${symbol}`);
    
    try {
      // Public market data through the server provider (no API keys needed)
      const provider = get().getProviderForExchange(exchange);
      if (!provider || provider.type !== 'ccxt-server') {
        throw new Error(`No suitable CCXT server provider found for exchange: ${exchange}`);
      }

      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);

      // Load orderbook via REST
      const orderbookData = await exchangeInstance.fetchOrderBook(symbol);

      if (!orderbookData) {
        throw new Error('No orderbook data received from exchange');
      }
      
      if (!orderbookData.bids || !orderbookData.asks || 
          !Array.isArray(orderbookData.bids) || !Array.isArray(orderbookData.asks)) {
        throw new Error('Invalid orderbook data format received');
      }
      
      console.log(`✅ [OrderBook] Loaded orderbook for ${exchange}:${market}:${symbol} (bids: ${orderbookData.bids.length}, asks: ${orderbookData.asks.length})`);
      
      // Save orderbook to store AND return it
      get().updateOrderBook(exchange, symbol, orderbookData, market);
      console.log(`💾 [OrderBook] OrderBook saved to store for ${exchange}:${market}:${symbol}`);
      
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
    
    console.log(`🚀 [Balance] Loading initial balance for account ${accountId} (${exchange}:${walletType})`);
    
    try {
      // Fetch account balance through the server provider's trading block.
      const serverProvider = await getServerTradingProvider(exchange, get);
      if (!serverProvider) {
        throw new Error(`No CCXT server provider found for exchange: ${exchange}`);
      }
      const creds = resolveCredentials(accountId, 'read');
      if (!creds) {
        throw new Error(`No credentials available for account ${accountId}`);
      }

      const walletParam = walletType === 'funding' ? 'spot' : walletType;
      console.log(`💰 [Balance Init] Fetching ${walletType} balance for account ${accountId} (${exchange}) via server`);

      const balanceData = await serverProvider.trading.fetchBalance(creds, exchange, walletParam);

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
      
      console.log(`✅ [Balance] Loaded balance for account ${accountId} (${exchange}:${walletType}) (currencies: ${balances.length})`);
      
      // Save balance to store AND return it
      get().updateBalance(accountId, exchangeBalances, walletType);
      console.log(`💾 [Balance] Balance saved to store for account ${accountId} (${exchange}:${walletType})`);
      
      return exchangeBalances;
      
    } catch (error) {
      console.error(`❌ [Balance] Failed to load balance for account ${accountId}:`, error);
      throw error;
    }
  },

  // REST data initialization for Ticker widgets
  initializeTickerData: async (exchange: string, symbol: string, market: MarketType): Promise<Ticker> => {
    console.log(`🚀 [Ticker] Loading ticker for ${exchange}:${market}:${symbol}`);
    
    try {
      // Use active provider for this exchange
      const provider = get().getProviderForExchange(exchange);
      if (!provider || provider.type !== 'ccxt-server') {
        throw new Error(`No suitable CCXT server provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for ticker data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
      
      console.log(`🔍 [initializeTickerData] Using ${provider.id} provider for ${exchange}:${market}`);
      
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
      
      console.log(`✅ [Ticker] Loaded ticker for ${exchange}:${market}:${symbol}:`, {
        bid: ticker.bid,
        ask: ticker.ask,
        midPrice: ticker.midPrice,
        last: ticker.last
      });
      
      // Save ticker to store AND return it
      get().updateTicker(exchange, symbol, ticker, market);
      console.log(`💾 [Ticker] Ticker saved to store for ${exchange}:${market}:${symbol}`);
      
      return ticker;
      
    } catch (error) {
      console.error(`❌ [Ticker] Failed to load ticker for ${exchange}:${market}:${symbol}:`, error);
      throw error;
    }
  },

  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number): Promise<Candle[]> => {
    console.log(`📜 [loadHistoricalCandles] Loading historical data before ${new Date(beforeTimestamp).toISOString()} for ${exchange}:${market}:${symbol}:${timeframe}`);
    
    try {
      // Use existing universal-browser provider for consistency
      const provider = get().getProviderForExchange(exchange);
      if (!provider || provider.type !== 'ccxt-server') {
        throw new Error(`No suitable CCXT server provider found for exchange: ${exchange}`);
      }

      // Get metadata instance (no API keys needed for historical data)
      const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
      
      console.log(`🔍 [loadHistoricalCandles] Using ${provider.id} provider for ${exchange}:${market}`);
      
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
      
      console.log(`📜 [loadHistoricalCandles] CCXT fetchOHLCV parameters: symbol=${symbol}, timeframe=${timeframe}, since=${new Date(sinceTimestamp).toISOString()}, limit=${optimalLimit}`);
      
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
      
             console.log(`✅ [loadHistoricalCandles] Loaded ${candles.length} historical candles (filtered from ${ohlcvData.length}, limit=${optimalLimit}) for ${exchange}:${market}:${symbol}:${timeframe} before ${new Date(beforeTimestamp).toISOString()}`);
       
       if (candles.length > 0) {
         console.log(`📊 [loadHistoricalCandles] Historical data range: ${new Date(candles[0].timestamp).toISOString()} → ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
       }
      
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
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const serverProvider = await getServerTradingProvider(account.exchange, get);
    if (!serverProvider) {
      throw new Error(`No CCXT server provider found for exchange: ${account.exchange}`);
    }
    const creds = resolveCredentials(accountId, 'read');
    if (!creds) {
      throw new Error(`No credentials available for account ${accountId}`);
    }

    console.log(`🔄 [fetchMyTrades] Loading trades for account ${accountId} (${account.exchange}) via server`);
    const trades = await serverProvider.trading.fetchMyTrades(creds, account.exchange, symbol, since, limit);

    return (trades || []).map((trade: any) => ({
      id: trade.id,
      timestamp: trade.timestamp,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      price: trade.price,
      cost: trade.cost,
      fee: trade.fee,
      info: trade.info,
    }));
  },

  fetchLedger: async (accountId: string, code?: string, since?: number, limit?: number): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const serverProvider = await getServerTradingProvider(account.exchange, get);
    if (!serverProvider) {
      throw new Error(`No CCXT server provider found for exchange: ${account.exchange}`);
    }
    const creds = resolveCredentials(accountId, 'read');
    if (!creds) {
      throw new Error(`No credentials available for account ${accountId}`);
    }

    console.log(`🔄 [fetchLedger] Loading ledger for account ${accountId} (${account.exchange}) via server`);
    const entries = await serverProvider.trading.fetchLedger(creds, account.exchange, code, since, limit);
    return entries || [];
  },

  fetchOrders: async (accountId: string, symbol?: string, since?: number, limit?: number): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const serverProvider = await getServerTradingProvider(account.exchange, get);
    if (!serverProvider) {
      throw new Error(`No CCXT server provider found for exchange: ${account.exchange}`);
    }
    const creds = resolveCredentials(accountId, 'read');
    if (!creds) {
      throw new Error(`No credentials available for account ${accountId}`);
    }

    console.log(`🔄 [fetchOrders] Loading orders for account ${accountId} (${account.exchange}) via server`);
    const orders = await serverProvider.trading.fetchOrders(creds, account.exchange, symbol, since, limit);
    return (orders || []).sort((a: any, b: any) => b.timestamp - a.timestamp);
  },

  fetchOpenOrders: async (accountId: string, symbol?: string): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const serverProvider = await getServerTradingProvider(account.exchange, get);
    if (!serverProvider) {
      throw new Error(`No CCXT server provider found for exchange: ${account.exchange}`);
    }
    const creds = resolveCredentials(accountId, 'read');
    if (!creds) {
      throw new Error(`No credentials available for account ${accountId}`);
    }

    console.log(`🔄 [fetchOpenOrders] Loading open orders for account ${accountId} (${account.exchange}) via server`);
    const orders = await serverProvider.trading.fetchOpenOrders(creds, account.exchange, symbol);
    return (orders || []).sort((a: any, b: any) => b.timestamp - a.timestamp);
  },

  fetchPositions: async (accountId: string, symbols?: string[]): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const serverProvider = await getServerTradingProvider(account.exchange, get);
    if (!serverProvider) {
      throw new Error(`No CCXT server provider found for exchange: ${account.exchange}`);
    }
    const creds = resolveCredentials(accountId, 'read');
    if (!creds) {
      throw new Error(`No credentials available for account ${accountId}`);
    }

    console.log(`🔄 [fetchPositions] Loading positions for account ${accountId} (${account.exchange}) via server`);
    const positions = await serverProvider.trading.fetchPositions(creds, account.exchange, symbols);
    return positions || [];
  }
 });
