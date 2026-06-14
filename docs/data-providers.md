# Data Providers

## Overview

Profitmaker is **backend-required**: all market data and trading go through a
`ccxt-server` provider that talks to the terminal server. There is no browser
CCXT — the `window.ccxt` CDN bundle and the `ccxt-browser` provider were removed
in Stage 2. The client provider implements the `MarketDataProvider` contract
(`@profitmaker/types`); on the server, requests are dispatched through a
pluggable **provider registry** (the built-in `ccxt`, or a module-supplied
provider). See [architecture.md](./architecture.md#server-provider-registry).

## Two provider contracts

The provider contract is **two separate interfaces** that meet across the HTTP
boundary — deliberately not unified, because they are genuinely asymmetric:

| | Client (`@profitmaker/types/providerContract.ts`) | Server (`@profitmaker/types/serverProviderContract.ts`) |
|---|---|---|
| Interfaces | `MarketDataProvider`, `ProviderTrading` | `ServerProviderInstance`, `ServerProviderTrading`, `ServerProviderFactory` |
| Binding | one instance per provider; exchange + auth are **per-call** args | constructed **per request-config** (`create(config)`); exchange/market/keys baked in, methods take a bare `symbol` |
| Return types | normalized domain types (`Candle`/`Trade`/`OrderBook`/`Ticker`) | raw exchange-native payloads (`unknown`), serialized straight through; the client normalizes on receipt |
| Streaming | `watch(params, onData, onError)` → `SubscriptionId` (callback + handle) | `watch(dataType, symbol, timeframe?)` → the next payload as a `Promise`, looped by the host |

They share only the leaf data types and `ExchangeCapabilities`. A module that
supplies a backend implements the **server** factory (`ServerProviderFactory` →
`create(config)` → `ServerProviderInstance`); the **client** always uses the one
built-in `ccxt-server` provider.

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

For **public** market data (candles, trades, order book, ticker) no credentials
are involved. For **authenticated** calls (balances, trades, orders, positions,
ledger) see [Authenticated calls](#authenticated-calls) below — the browser sends
no keys; the server attaches them.

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
| `balance` | `fetchBalance` | `watchBalance` | Account balances (authenticated — see below) |

## Authenticated calls

Public market data needs no keys. Private data and trading flow through the
**accountId path** (central accounts) — the browser never holds exchange secrets.

**Store actions** (in `dataActions.ts`) take an `accountId`:

```typescript
fetchBalance / initializeBalanceData(accountId, walletType)
fetchMyTrades(accountId, symbol?, since?, limit?)
fetchOrders(accountId, symbol?, since?, limit?)
fetchOpenOrders(accountId, symbol?)
fetchPositions(accountId, symbols?)
fetchLedger(accountId, code?, since?, limit?)
```

Each action resolves the account (exchange + credential id), builds an
`AccountRef` — `{ accountId, want: 'read' | 'trade' }` — and calls the client
provider's `trading.*` block. These reads pass `want: 'read'`; order placement
and cancellation pass `want: 'trade'`.

**Client provider** (`ccxtServerProvider.ts`, the `trading` object): `authBody()`
turns the `AccountRef` into a request body of `{ config, accountId, want }` that
carries **no secrets** (the inline-credentials path remains supported
transitionally for self-host). It POSTs to `/api/exchange/*`.

**Server** (`routes/exchange.ts`, `resolveAuthedConfig`): when `accountId` is
present it requires an SSO context, fetches the decrypted keys server-side via
`fetchCredentials({ ssoUserId, credentialId, want })`, and merges them into the
CCXT request config **before** calling the provider. Trade endpoints force
`want: 'trade'` (a read-only grant is rejected 403); read endpoints use `'read'`.

### Trading methods

The `ProviderTrading` block (client) / `ServerProviderTrading` (server) exposes:

| Method | Route | Access (`want`) | Notes |
|--------|-------|-----------------|-------|
| `createOrder` | `POST /api/exchange/createOrder` | `trade` | Place an order |
| `cancelOrder` | `POST /api/exchange/cancelOrder` | `trade` | Cancel by id + symbol |
| `fetchBalance` | `POST /api/exchange/fetchBalance` | `read` | Account balances |
| `fetchMyTrades` | `POST /api/exchange/fetchMyTrades` | `read` | Filled trades |
| `fetchOrders` | `POST /api/exchange/fetchOrders` | `read` | All orders |
| `fetchOpenOrders` | `POST /api/exchange/fetchOpenOrders` | `read` | Open orders |
| `fetchPositions` | `POST /api/exchange/fetchPositions` | `read` | Futures positions |
| `fetchLedger` | `POST /api/exchange/fetchLedger` | `read` | Transaction history — deposits, withdrawals, transfers, trades, fees |

Server-side, the trading methods that may be unsupported by an exchange are
guarded by CCXT's `has` flags (e.g. `ex.has?.fetchLedger`) and return `[]` when
the exchange lacks the capability, rather than throwing.

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
