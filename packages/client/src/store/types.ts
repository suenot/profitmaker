import type {
  DataProvider,
  DataType,
  DataFetchSettings,
  ActiveSubscription,
  RestCycleManager,
  Candle,
  Trade,
  OrderBook,
  Ticker,
  ExchangeBalances,
  ProviderOperationResult,
  DataFetchMethod,
  OrderBookMethodSelection,
  Timeframe,
  MarketType,
  WalletType,
  ChartUpdateListener,
  ChartUpdateEvent,
  ProviderExchangeMapping,
  SubscriptionConfig,
  LeverageMarket,
  LeverageMarketType,
  LeverageSetting,
  LeverageTarget,
  SetLeverageResult
} from '../types/dataProviders';
import type { User } from './userStore';

// Store state interface
export interface DataProviderState {
  // Data providers
  providers: Record<string, DataProvider>;
  activeProviderId: string | null; // Deprecated, kept for compatibility

  // Data fetch settings
  dataFetchSettings: DataFetchSettings;

  // Active subscriptions with deduplication
  activeSubscriptions: Record<string, ActiveSubscription>;

  // REST cycles
  restCycles: Record<string, RestCycleManager>;

  // Centralized data storage
  marketData: {
    candles: Record<string, Record<string, Record<string, Record<string, Candle[]>>>>; // [exchange][market][symbol][timeframe] -> Candle[]
    trades: Record<string, Record<string, Record<string, Trade[]>>>;   // [exchange][market][symbol] -> Trade[]
    orderbook: Record<string, Record<string, Record<string, OrderBook>>>; // [exchange][market][symbol] -> OrderBook
    balance: Record<string, Record<string, ExchangeBalances>>; // [accountId][walletType] -> ExchangeBalances
    ticker: Record<string, Record<string, Record<string, Ticker & { lastUpdate: number }>>>; // [exchange][market][symbol] -> Ticker with cache timestamp
  };

  // Event system for notifying Chart widgets
  chartUpdateListeners: Record<string, ChartUpdateListener[]>; // [subscriptionKey] -> [listeners]

  // State
  loading: boolean;
  error: string | null;
}

// Store actions interface
export interface DataProviderActions {
  // Provider management
  addProvider: (provider: DataProvider) => void;
  removeProvider: (providerId: string) => void;
  setActiveProvider: (providerId: string) => void;

  // NEW: Multiple provider management
  enableProvider: (providerId: string) => void;
  disableProvider: (providerId: string) => void;
  toggleProvider: (providerId: string) => void;
  isProviderEnabled: (providerId: string) => boolean;
  getEnabledProviders: () => DataProvider[];

  // NEW: Advanced provider management with user integration
  createProvider: (type: 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter', name: string, exchanges: string[], config?: any) => DataProvider;
  updateProvider: (providerId: string, updates: { name?: string; exchanges?: string[]; priority?: number; config?: any }) => void;
  getProviderForExchange: (exchange: string) => DataProvider | null;
  getProviderExchangeMappings: (exchanges: string[]) => ProviderExchangeMapping[];
  updateProviderPriority: (providerId: string, priority: number) => void;

  // NEW: Get symbols and markets from provider
  getSymbolsForExchange: (exchange: string, limit?: number, marketType?: string) => Promise<string[]>;
  getMarketsForExchange: (exchange: string) => Promise<string[]>;
  getAllSupportedExchanges: () => string[];

  // NEW: Get timeframes from provider
  getTimeframesForExchange: (exchange: string) => Timeframe[];

  // Data fetch settings management
  setDataFetchMethod: (method: DataFetchMethod) => Promise<void>;
  setRestInterval: (dataType: DataType, interval: number) => void;

  // Deduplicated subscriptions management
  subscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, config?: SubscriptionConfig) => Promise<ProviderOperationResult>;
  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, config?: Pick<SubscriptionConfig, 'providerId'>) => void;
  forceCloseSubscription: (subscriptionKey: string) => void;

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

  // Leverage: read the exchange's caps, read what the account has set, write new
  // values. Reads use 'read' access, the write path requires 'trade'.
  leverageMarkets: (accountId: string, marketType?: LeverageMarketType) => Promise<LeverageMarket[]>;
  fetchLeverages: (accountId: string, symbols?: string[]) => Promise<LeverageSetting[]>;
  setLeverages: (
    accountId: string,
    symbols: string[],
    target: LeverageTarget,
    opts?: { dryRun?: boolean },
  ) => Promise<SetLeverageResult[]>;

  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => void;
  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market?: MarketType) => void;

  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, providerId?: string) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];

  // Event system for Chart widgets
  addChartUpdateListener: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, listener: ChartUpdateListener) => void;
  removeChartUpdateListener: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, listener: ChartUpdateListener) => void;
  emitChartUpdateEvent: (event: ChartUpdateEvent) => void;

  // Internal data flow management functions
  startDataFetching: (subscriptionKey: string) => Promise<void>;
  stopDataFetching: (subscriptionKey: string) => void;
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  fetchBalance: (accountId: string, walletType?: WalletType) => Promise<void>;

  // Intelligent CCXT method selection
  selectOptimalOrderBookMethod: (exchange: string, exchangeInstance: any) => OrderBookMethodSelection;

  // Cleanup
  cleanup: () => void;
}

// Main store type
export type DataProviderStore = DataProviderState & DataProviderActions;
