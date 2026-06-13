# Data Providers

## Overview

Profitmaker is **backend-required**: all market data and trading go through a
`ccxt-server` provider that talks to the terminal server. There is no browser
CCXT — the `window.ccxt` CDN bundle and the `ccxt-browser` provider were removed
in Stage 2. The client provider implements the `MarketDataProvider` contract
(`@profitmaker/types`); on the server, requests are dispatched through a
pluggable **provider registry** (the built-in `ccxt`, or a module-supplied
provider). See [architecture.md](./architecture.md#server-provider-registry).

## Client provider types

The client data-provider store (`dataProviderStore`) tracks these provider types:

| Type | Class | Description |
|------|-------|-------------|
| `ccxt-server` | `CCXTServerProviderImpl` (`packages/client/src/store/providers/ccxtServerProvider.ts`) | Talks to the terminal server over HTTP + Socket.IO. **The only implemented type.** |
| `marketmaker.cc` | -- | Planned — external data provider |
| `custom-server-with-adapter` | -- | Planned — custom server with adapter interface |

> The `ccxt-browser` type and `CCXTBrowserProviderImpl` were removed in Stage 2.

## The default server provider

A `ccxt-server` provider is created automatically on first load:

```typescript
{
  id: 'primary-server',
  type: 'ccxt-server',
  name: 'Primary Server',
  status: 'connected',
  exchanges: ['*'],    // supports all exchanges
  priority: 1,
  config: {
    // resolved client-side: VITE_SERVER_URL → page origin (prod) → http://localhost:3001
    serverUrl: 'http://localhost:3001',
  },
}
```

The store's `persist` is at version 2 with a `migrate()` that drops any legacy
`ccxt-browser` provider and ensures `primary-server` exists.

**First-run UX.** The terminal is gated by `BackendGate` (around the `/` route):
it health-checks the server, and if unreachable shows `ConnectionScreen` — inputs
for the server URL + access token with a **Test connection** button — which
persists into the `primary-server` config. Once connected it renders the
terminal and runs a 30s health poll, showing a non-blocking banner if the backend
drops.

**How a request flows:**
1. The client sends an HTTP POST to `<serverUrl>/api/exchange/<method>` (or a
   Socket.IO `subscribe` for streaming).
2. The server resolves a provider via the registry (`registry.resolve(exchange,
   providerId?)`) — the built-in `ccxt` by default.
3. The provider calls the exchange (no CORS issues; CCXT Pro for WebSocket).
4. The response (with a `provider` field naming the source) returns to the client,
   which normalizes and stores it.

Credentials for authenticated calls travel in the request `config`; the server
stays stateless about user accounts.

## Provider Selection

When a widget subscribes to data, the store picks the best provider:

1. Find all providers that support the requested exchange
2. Sort by priority (lower number = higher priority)
3. Use the first enabled provider

You can control this by:
- Setting provider priority: `updateProviderPriority(providerId, priority)`
- Enabling/disabling providers: `toggleProvider(providerId)`
- Restricting exchanges per provider: set `exchanges` array

## Data Types

| DataType | REST Method | WebSocket Method | Description |
|----------|------------|------------------|-------------|
| `candles` | `fetchOHLCV` | `watchOHLCV` | OHLCV candlestick data |
| `trades` | `fetchTrades` | `watchTrades` | Recent trades feed |
| `orderbook` | `fetchOrderBook` | `watchOrderBook` | Order book depth |
| `ticker` | `fetchTicker` | `watchTicker` | 24h ticker summary |
| `balance` | `fetchBalance` | `watchBalance` | Account balances (requires API key) |

## WebSocket vs REST

The `dataFetchSettings.method` controls the default strategy:

### WebSocket mode (`'websocket'`)

- Real-time streaming via CCXT Pro
- Lower latency, more efficient
- Requires CCXT Pro support on the exchange
- Falls back to REST if WebSocket unavailable

### REST mode (`'rest'`)

- Polling at configurable intervals
- Works with all exchanges
- Default intervals (configurable per data type):

```typescript
restIntervals: {
  trades: 1000,     // 1 second
  candles: 5000,    // 5 seconds
  orderbook: 500,   // 0.5 seconds
  balance: 30000,   // 30 seconds
  ticker: 600000    // 10 minutes
}
```

### Fallback

If WebSocket is selected but the exchange doesn't support it for a given data type, the system automatically falls back to REST polling.

## Subscription System

Subscriptions are deduplicated by key: `{exchange}:{market}:{symbol}:{dataType}:{timeframe}`

```typescript
// Widget subscribes
await subscribe(
  'chart-widget-abc',    // subscriberId (unique per widget instance)
  'binance',             // exchange
  'BTC/USDT',           // symbol
  'candles',            // dataType
  '1h',                 // timeframe (for candles)
  'spot'                // market type
);

// Widget unsubscribes on unmount
unsubscribe('chart-widget-abc', 'binance', 'BTC/USDT', 'candles', '1h', 'spot');
```

Multiple widgets subscribing to the same key share one data stream. The stream is closed only when the last subscriber unsubscribes.

## Data Initialization

Widgets typically need initial data before streaming begins. Use the `initialize*` methods:

```typescript
// Fetch initial candles for a chart
const candles = await initializeChartData('binance', 'BTC/USDT', '1h', 'spot');

// Fetch initial trades
const trades = await initializeTradesData('binance', 'BTC/USDT', 'spot', 50);

// Fetch initial orderbook
const orderbook = await initializeOrderBookData('binance', 'BTC/USDT', 'spot');

// Load more historical candles (infinite scroll)
const older = await loadHistoricalCandles('binance', 'BTC/USDT', '1h', 'spot', beforeTimestamp);
```

## Chart Update Events

The store includes an event system specifically for Chart widgets. When new candles arrive via WebSocket, the store emits events that Night Vision chart instances can listen to:

```typescript
// Register listener
addChartUpdateListener('binance', 'BTC/USDT', '1h', 'spot', listener);

// Remove listener
removeChartUpdateListener('binance', 'BTC/USDT', '1h', 'spot', listener);
```

## CCXT Instance Management

Exchange instances live **on the server**, cached in
`packages/server/src/services/ccxtCache.ts` (used by the built-in `ccxt`
provider):

- Instances are keyed by: `{exchangeId}:{marketType}:{ccxtType}:{sandbox}:{apiKeyPrefix}`
- Cache TTL: 24 hours, cleanup every 10 minutes
- Markets are loaded on first instance creation (`exchange.loadMarkets()`)

## Intelligent Method Selection

For order book fetching, the store includes `selectOptimalOrderBookMethod()` which checks exchange capabilities and selects the best available method (some exchanges support `fetchOrderBook` but not `watchOrderBook`, or have different depth limits).

## Supported Exchanges

CCXT supports 100+ exchanges. Common ones:

binance, bybit, okx, bitget, kucoin, gate, mexc, huobi, kraken, coinbase, bitfinex, bitmex, phemex, deribit, and many more.

The client's `useExchangesList` hook (and the provider discovery path) fetch the
full list from the server: `GET /api/exchange/list` returns `ccxt.exchanges`.
