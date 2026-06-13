import type { ExchangeCapabilities } from './providerContract';

/**
 * Server-side market-data provider contract.
 *
 * This is the seam the server's /api/exchange/* routes and the Socket.IO watch
 * loop program against, so the terminal can serve data/trading from more than
 * one backend (the built-in ccxt, or a module-supplied provider — e.g. a Rust
 * implementation wrapped in a Node.js napi binding).
 *
 * Why this is a SEPARATE interface from the client `MarketDataProvider` (rather
 * than a shared one): the two live on opposite sides of the HTTP boundary and
 * have genuinely different shapes. The client contract takes already-normalized
 * params and returns normalized domain types for UI consumption. The server
 * contract is constructed per-request from a `ProviderRequestConfig` (exchange +
 * optional credentials + market type) and returns raw, exchange-native payloads
 * that the routes serialize straight through (the client normalizes). Unifying
 * them would distort one side; they intentionally share only the leaf data
 * types and `ExchangeCapabilities`.
 */

/** Per-request config passed to a server provider (mirrors the wire `config`). */
export interface ProviderRequestConfig {
  exchangeId: string;
  marketType?: string;
  ccxtType?: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
}

/** Streaming data types a server provider can watch. */
export type ServerWatchDataType = 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance';

/**
 * A live server-side provider instance for one ProviderRequestConfig. Methods
 * return exchange-native payloads (the routes pass `data` straight through).
 * `watch` returns the next streaming payload each call; the host loops it.
 */
export interface ServerProviderInstance {
  fetchTicker(symbol: string): Promise<unknown>;
  fetchOrderBook(symbol: string, limit?: number): Promise<unknown>;
  fetchTrades(symbol: string, since?: number, limit?: number): Promise<unknown[]>;
  fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number): Promise<unknown[]>;
  fetchBalance(): Promise<unknown>;
  /** Capabilities (`has`/symbols/markets/timeframes/fees) for discovery. */
  getCapabilities(): Promise<ExchangeCapabilities>;
  /** Full market metadata for one symbol (limits/precision), or null. */
  getMarket(symbol: string): Promise<unknown>;

  /** Await the next streaming payload for `dataType` (ohlcv needs `timeframe`). */
  watch(dataType: ServerWatchDataType, symbol: string, timeframe?: string): Promise<unknown>;
  /** Whether the underlying instance supports a given watch type. */
  supportsWatch(dataType: ServerWatchDataType): boolean;

  /** Optional authenticated trading; absent ⇒ provider is read-only. */
  trading?: ServerProviderTrading;

  /** Release any resources (sockets, native handles). Optional. */
  dispose?(): Promise<void> | void;
}

export interface ServerProviderTrading {
  createOrder(
    symbol: string,
    type: string,
    side: 'buy' | 'sell',
    amount: number,
    price?: number,
    params?: Record<string, unknown>,
  ): Promise<unknown>;
  cancelOrder(orderId: string, symbol: string): Promise<unknown>;
  fetchMyTrades(symbol?: string, since?: number, limit?: number): Promise<unknown[]>;
  fetchOrders(symbol?: string, since?: number, limit?: number): Promise<unknown[]>;
  fetchOpenOrders(symbol?: string): Promise<unknown[]>;
  fetchPositions(symbols?: string[]): Promise<unknown[]>;
}

/**
 * Factory registered with the ServerProviderRegistry. `create()` resolves a
 * live instance for one request config; the host caches/instantiates as needed.
 */
export interface ServerProviderFactory {
  /** Stable id used for explicit selection (`providerId`) and routing. */
  id: string;
  displayName: string;
  /** Exchanges this provider serves; '*' means all. */
  supportedExchanges: string[] | '*';
  /** Lower number = higher priority when several providers match an exchange. */
  priority: number;
  create(config: ProviderRequestConfig): Promise<ServerProviderInstance> | ServerProviderInstance;
}

/** Public description of a registered provider (GET /api/providers/available). */
export interface AvailableProvider {
  id: string;
  displayName: string;
  exchanges: string[] | '*';
  priority: number;
  /** Set when the provider came from an installed module. */
  fromModule?: string;
}
