# Mock Provider Module (example)

A minimal **provider module**: it registers a server-side data provider with the
terminal's provider registry, so the terminal can serve market data from
something other than the built-in `ccxt`.

This one returns static/random data for the `mockex` exchange. It exists to show
the contract — a real provider would wrap a REST/WebSocket feed or a **native
binding** (e.g. a Rust implementation compiled to a Node.js napi addon, installed
with `bun add your-native-pkg`). Nothing in the contract assumes pure JS.

## How it works

On `start(ctx)` the module calls:

```ts
ctx.providers.register({
  id: 'mock',
  displayName: 'Mock Provider (example)',
  supportedExchanges: ['mockex'],
  priority: 50,
  create: (config) => makeMockInstance(config), // → ServerProviderInstance
});
```

The returned `ServerProviderInstance` implements `fetchTicker/OrderBook/Trades/
OHLCV/Balance`, `getCapabilities`, `getMarket`, and `watch` (plus an optional
`trading` block — omitted here, so the provider is read-only).

The host **auto-unregisters** every provider a module registered when the module
stops or is disabled — no manual cleanup needed (the `dispose()` in `stop()` is
belt-and-braces).

## Routing & priority

`/api/exchange/*` and the Socket.IO watch loop resolve a provider via
`registry.resolve(exchange, providerId?)`:

- **Explicit:** pass `providerId: "mock"` in the request body to force this provider.
- **By priority:** for an exchange this provider supports (`mockex`), the lowest
  `priority` number wins. This module uses `50`, ahead of the built-in `ccxt`
  (`100`), so `mockex` requests resolve here automatically.

The response includes a `provider` field reporting which provider served it.

## Try it

1. Build: `bun run build`
2. Install it into a running terminal (dev): drop the package where the module
   loader can see it and enable it, or `bun add` it in the installed-modules dir.
3. Verify:
   - `GET /api/providers/available` now lists `{ id: "mock", fromModule: "mock-provider", ... }`
   - `POST /api/exchange/fetchTicker { "config": { "exchangeId": "mockex" }, "symbol": "MOCK/USDT" }`
     returns mock data with `"provider": "mock"`
   - `POST /api/exchange/fetchTicker { ..., "providerId": "mock" }` forces it explicitly
4. Disable the module → the `mock` provider disappears from `/api/providers/available`,
   and `ccxt` keeps serving everything else.

## Permissions

Declares `"provider"` (registers a server provider) and `"market-data"` in its
manifest (`package.json` → `profitmaker.permissions`).
