import { z } from 'zod';
import type {
  Candle,
  Trade,
  OrderBook,
  Ticker,
  ExchangeBalances,
  DataType,
  Timeframe,
  MarketType,
} from './dataProviders';

/**
 * Formal market-data provider contract.
 *
 * Stage 2 makes the ccxt-server the only data path; this interface is the seam
 * every provider implementation (and the module system) programs against. It
 * intentionally mirrors the methods the CCXT server proxy already exposes so the
 * existing fetching/data actions can call the contract instead of branching on
 * provider type.
 */

// --- zod schemas for network-crossing params -------------------------------
// These validate the shape of arguments that cross the client→server boundary.
// Keep them permissive enough to match CCXT semantics (optional since/limit).

export const exchangeIdSchema = z.string().min(1);
export const symbolSchema = z.string().min(1);

export const timeframeSchema = z.enum([
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M',
]);

export const marketTypeSchema = z.enum(['spot', 'futures', 'margin']);

export const dataTypeSchema = z.enum(['candles', 'trades', 'orderbook', 'balance', 'ticker']);

/** Credentials for authenticated (trading) operations. */
export const providerCredentialsSchema = z.object({
  apiKey: z.string().optional(),
  secret: z.string().optional(),
  password: z.string().optional(),
  uid: z.string().optional(),
  sandbox: z.boolean().optional(),
});
export type ProviderCredentials = z.infer<typeof providerCredentialsSchema>;

/**
 * Central-accounts reference for an authenticated operation. The browser holds
 * NO secrets: it sends only the credential id and the desired access level, and
 * the server resolves the decrypted keys (server↔auth) under the caller's SSO
 * identity. Orders require `want:'trade'`; private reads use `want:'read'`.
 */
export const accountRefSchema = z.object({
  accountId: z.string().min(1),
  want: z.enum(['read', 'trade']),
});
export type AccountRef = z.infer<typeof accountRefSchema>;

/**
 * Credential argument for trading ops. The END STATE is {@link AccountRef}
 * (server-side key resolution); inline {@link ProviderCredentials} remains a
 * transitional shape so the migration can be incremental.
 */
export type TradeAuth = ProviderCredentials | AccountRef;

/** Type guard: is this trade-auth an account reference (no inline secrets)? */
export function isAccountRef(auth: TradeAuth): auth is AccountRef {
  return (auth as AccountRef).accountId !== undefined;
}

export const fetchCandlesParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  timeframe: timeframeSchema.optional(),
  market: marketTypeSchema.optional(),
  since: z.number().optional(),
  limit: z.number().optional(),
});
export type FetchCandlesParams = z.infer<typeof fetchCandlesParamsSchema>;

export const fetchTradesParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  market: marketTypeSchema.optional(),
  since: z.number().optional(),
  limit: z.number().optional(),
});
export type FetchTradesParams = z.infer<typeof fetchTradesParamsSchema>;

export const fetchOrderBookParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  market: marketTypeSchema.optional(),
  limit: z.number().optional(),
});
export type FetchOrderBookParams = z.infer<typeof fetchOrderBookParamsSchema>;

export const fetchTickerParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  market: marketTypeSchema.optional(),
});
export type FetchTickerParams = z.infer<typeof fetchTickerParamsSchema>;

export const watchParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  dataType: dataTypeSchema,
  timeframe: timeframeSchema.optional(),
  market: marketTypeSchema.optional(),
});
export type WatchParams = z.infer<typeof watchParamsSchema>;

export const createOrderParamsSchema = z.object({
  exchange: exchangeIdSchema,
  symbol: symbolSchema,
  type: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  amount: z.number(),
  price: z.number().optional(),
  market: marketTypeSchema.optional(),
  params: z.record(z.any()).optional(),
});
export type CreateOrderParams = z.infer<typeof createOrderParamsSchema>;

// --- provider info / health ------------------------------------------------

export interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  /** Exchanges this provider serves; ['*'] means all. */
  exchanges: string[];
}

export interface ProviderHealth {
  ok: boolean;
  version?: string;
  ccxtVersion?: string;
  socketPort?: number;
  uptime?: number;
  db?: boolean;
  error?: string;
}

export interface ExchangeCapabilities {
  has: Record<string, boolean | undefined>;
  symbols: string[];
  markets: string[];
  timeframes: string[];
  fees?: Record<string, any>;
}

/** Handle returned by watch(); call unsubscribe(id) to tear it down. */
export type SubscriptionId = string;

/**
 * The CLIENT market-data contract. A provider exposes read-only market data plus
 * an optional trading block for authenticated operations. All data-fetch methods
 * return our normalized types (Candle/Trade/OrderBook/...), not raw CCXT shapes.
 *
 * This is intentionally NOT the same interface as the server-side
 * `ServerMarketDataProvider` (serverProviderContract.ts) — see that file for the
 * three concrete asymmetries (per-call vs per-request-config binding, normalized
 * vs raw return types, callback vs pull streaming) that justify keeping them
 * separate rather than unifying.
 */
export interface MarketDataProvider {
  readonly info: ProviderInfo;

  healthCheck(): Promise<ProviderHealth>;

  // Discovery
  listExchanges(): Promise<string[]>;
  getCapabilities(exchange: string, market?: MarketType): Promise<ExchangeCapabilities>;
  getSymbols(exchange: string, market?: MarketType, limit?: number): Promise<string[]>;
  getMarkets(exchange: string): Promise<string[]>;
  getTimeframes(exchange: string): Promise<Timeframe[]>;

  // REST data
  fetchCandles(params: FetchCandlesParams): Promise<Candle[]>;
  fetchTrades(params: FetchTradesParams): Promise<Trade[]>;
  fetchOrderBook(params: FetchOrderBookParams): Promise<OrderBook>;
  fetchTicker(params: FetchTickerParams): Promise<Ticker>;
  fetchBalance(accountId: string, walletType?: string): Promise<ExchangeBalances>;

  // Streaming
  watch(
    params: WatchParams,
    onData: (data: any) => void,
    onError?: (error: any) => void,
  ): Promise<SubscriptionId>;
  unsubscribe(subscriptionId: SubscriptionId): Promise<void>;
  dispose(): Promise<void>;

  /** Authenticated trading — present only on providers that support it. */
  trading?: ProviderTrading;
}

/**
 * Authenticated operations. The first argument is a {@link TradeAuth}: in the
 * central-accounts model it's an {@link AccountRef} ({accountId, want}) and the
 * server resolves the keys; inline {@link ProviderCredentials} stays accepted
 * transitionally. The provider forwards the right body to the server, which
 * owns access enforcement (read-level → 403 on trade ops).
 */
export interface ProviderTrading {
  createOrder(auth: TradeAuth, params: CreateOrderParams): Promise<any>;
  cancelOrder(auth: TradeAuth, exchange: string, orderId: string, symbol: string, market?: MarketType): Promise<any>;
  fetchBalance(auth: TradeAuth, exchange: string, walletType?: string): Promise<ExchangeBalances>;
  fetchMyTrades(auth: TradeAuth, exchange: string, symbol?: string, since?: number, limit?: number): Promise<any[]>;
  fetchOrders(auth: TradeAuth, exchange: string, symbol?: string, since?: number, limit?: number): Promise<any[]>;
  fetchOpenOrders(auth: TradeAuth, exchange: string, symbol?: string): Promise<any[]>;
  fetchPositions(auth: TradeAuth, exchange: string, symbols?: string[]): Promise<any[]>;
}

// --- tiny provider registry (module-system seam) ---------------------------

/**
 * Minimal registry so the module system (and the store) can register and look
 * up provider implementations by id without importing concrete classes.
 */
export class ProviderRegistry {
  private providers = new Map<string, MarketDataProvider>();

  register(provider: MarketDataProvider): void {
    this.providers.set(provider.info.id, provider);
  }

  get(id: string): MarketDataProvider | undefined {
    return this.providers.get(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  list(): MarketDataProvider[] {
    return Array.from(this.providers.values());
  }
}
