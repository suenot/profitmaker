import type { ExchangeCapabilities } from './providerContract';

/**
 * Server-side market-data provider contract.
 *
 * This is the seam the server's /api/exchange/* routes and the Socket.IO watch
 * loop program against, so the terminal can serve data/trading from more than
 * one backend (the built-in ccxt, or a module-supplied provider — e.g. a Rust
 * implementation wrapped in a Node.js napi binding).
 *
 * NOT UNIFIED with the client `MarketDataProvider` — deliberately. Unification
 * was the default (per the design ruling: one contract if the differences are
 * cosmetic), but these two are GENUINELY ASYMMETRIC, so the asymmetry is
 * documented here in the open rather than hidden behind `any`/casts. The three
 * concrete differences:
 *
 *  1. Binding/lifecycle. The client provider is ONE instance per provider;
 *     exchange + credentials are per-CALL arguments (`params`, `creds`). The
 *     server provider is constructed PER REQUEST-CONFIG (`create(config)`), so
 *     exchange + credentials + market type are baked into the instance and the
 *     methods take a bare `symbol`. This is exactly the "server needs a
 *     per-request credentials/exchange context the client doesn't" case the
 *     ruling called out as the trigger to keep them separate + document.
 *  2. Return types. The client returns NORMALIZED domain types (Candle/Trade/
 *     OrderBook/Ticker) for the UI. The server returns RAW exchange-native
 *     payloads (`unknown`) that the routes serialize straight through; the
 *     client normalizes on receipt. Collapsing these would force a normalize
 *     step onto the server (pointless round-trip) or leak `unknown` into the
 *     client surface.
 *  3. Streaming model. The client `watch(params, onData, onError)` returns a
 *     `SubscriptionId` (callback + handle). The server `watch(dataType, symbol)`
 *     returns the NEXT payload as a `Promise` that the host loops — there is no
 *     callback registry on the server side.
 *
 * They intentionally share only the leaf data types and `ExchangeCapabilities`.
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
  /** Account balance-movement history (deposits/withdrawals/trades/fees/transfers). */
  fetchLedger(code?: string, since?: number, limit?: number): Promise<unknown[]>;
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
