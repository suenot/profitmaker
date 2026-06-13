# Architecture

## Workspace Overview

Profitmaker v3 is a Bun workspace monorepo:

```
packages/
├── types/    @profitmaker/types        Shared TypeScript types, Zod schemas (incl. provider contracts)
├── sdk/      @profitmaker/module-sdk    Module SDK: TerminalAPI types, manifest schema, vite preset, runtime shims
├── server/   @profitmaker/server       Elysia (Bun) + Socket.IO backend (+ provider registry, module manager)
└── client/   @profitmaker/client       React 18 + Vite frontend (+ widget registry, module runtime)
```

> `@profitmaker/core` was removed in Stage 2 (zero imports); shared logic/types
> moved into `@profitmaker/types` or the relevant package.

### Dependency Graph

```
@profitmaker/client
  ├── @profitmaker/types
  └── @profitmaker/module-sdk
        └── @profitmaker/types

@profitmaker/server
  ├── @profitmaker/module-sdk
  └── @profitmaker/types
```

Both client and server depend on types. Cross-package imports use the workspace protocol:

```json
// packages/client/package.json
"dependencies": {
  "@profitmaker/types": "workspace:*"
}
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun | 1.0+ |
| Frontend | React + TypeScript | 18.3 |
| Bundler | Vite + SWC | 5.4 |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS) | -- |
| State | Zustand + Immer | 5.0 |
| Data Fetching | TanStack React Query | 5.x |
| Routing | TanStack Router | 1.x |
| Charts | Night Vision (OHLCV), Recharts (pie/bar) | -- |
| Exchange API | CCXT (REST + WebSocket Pro) | 4.4 |
| Backend | Elysia (Bun) | 1.3 |
| Realtime | Socket.IO | 4.8 |
| Encryption | Web Crypto API (AES-256-GCM) | -- |
| Testing | Vitest (client), bun:test (server) | -- |
| Virtualization | TanStack Virtual | 3.x |

## Package Details

### @profitmaker/types

Pure TypeScript types and Zod schemas. No runtime dependencies except `zod`.

Key exports:
- `Dashboard`, `Widget`, `WidgetPosition` -- dashboard/widget schemas
- `DataProvider`, `ActiveSubscription`, `Candle`, `Trade`, `OrderBook`, `Ticker` -- market data types
- `Group` -- widget grouping types
- `Deal`, `DealTrade` -- deals/position tracking types

### @profitmaker/module-sdk

The contract shared by the host and third-party **modules** (see
[Modules](modules.md)). No heavy runtime deps.

Key exports:
- `TerminalAPI`, `WidgetDefinition`, `WidgetProps`, `WidgetSettingsProps`,
  `FrontendModule` -- the frontend module contract + `TERMINAL_API_VERSION`
- `BackendModule`, `BackendModuleContext` -- the backend module contract
- `ModuleManifestSchema`, `InstalledModule`, `MODULE_KEYWORD` -- manifest schema
  + discovery key, used by both server (install) and client (load)
- `defineModule`, `getTerminal`, and hook re-exports (`useWidgetGroup`,
  `useMarketData`, `useModuleSocket`)
- `@profitmaker/module-sdk/vite` -- the `profitmakerModule()` vite preset
- `runtime/*` -- shims that alias a module's `react`/`react-dom`/`zustand`/SDK
  imports to the host singletons on `window.__PROFITMAKER__`

> **Removed in Stage 2:** `@profitmaker/core` and the browser CCXT path. There is
> no `window.ccxt` / CDN bundle anymore — all market data and trading go through
> the server. Shared types now live in `@profitmaker/types`; client type files
> re-export from it.

### @profitmaker/server

Elysia (on Bun) server with:
- REST endpoints for market-data/trading operations (`/api/exchange/*`),
  dispatched through the **server provider registry** (see below)
- Socket.IO server for real-time data streaming
- Provider instance caching (24h TTL, auto-cleanup every 10min)
- Bearer token / session / SSO authentication
- CORS proxy for exchanges that block browser requests

### @profitmaker/client

React SPA with:
- Vite dev server on port 8080
- Free-form dashboard with draggable, resizable widgets
- Zustand stores persisted to localStorage
- A single data path: the `ccxt-server` provider (default `primary-server`),
  gated by `BackendGate` (health-checked; first-run `ConnectionScreen`)
- Widget grouping system (shared exchange/symbol context)

## Server provider registry

The server serves data/trading through a pluggable **provider registry**, not a
hardcoded CCXT call, so the terminal can offer more than one backend (the
built-in `ccxt`, or a module-supplied provider such as a Rust napi binding).

```
ServerProviderFactory { id, displayName, supportedExchanges, priority, create() }
  -> registered at boot ('ccxt', priority 100, all exchanges)
  -> or by a module via ctx.providers.register() (auto-unregistered on stop)

registry.resolve(exchange, providerId?)
  -> explicit providerId, else lowest-priority factory supporting the exchange
  -> create(config) -> ServerProviderInstance (per request config)
```

`/api/exchange/*` and the Socket.IO watch loop both dispatch through
`registry.resolve()`. Requests may pass an optional `providerId`; responses
echo the resolved provider in a `provider` field. `GET /api/providers/available`
lists the registered providers. See [modules.md](./modules.md#provider-modules).

## Data Flow

### Market Data (REST)

```
User opens widget
  -> Widget subscribes via dataProviderStore.subscribe()
  -> Store selects the ccxt-server provider for the exchange
  -> CCXTServerProviderImpl sends HTTP POST to the server (/api/exchange/*)
  -> Server registry.resolve(exchange, providerId?) -> provider instance
  -> Provider fetches data (built-in ccxt, or a module provider)
  -> Response (with `provider` field) sent back to the browser
  -> Data stored in dataProviderStore.marketData
  -> Widget reads from store, re-renders
```

### WebSocket Streaming (via Server)

```
Client connects to Socket.IO server
  -> Client sends 'authenticate' event with token
  -> Client sends 'subscribe' event (exchange, symbol, dataType, providerId?)
  -> Server resolves the provider via the registry and starts a watch loop
  -> Server emits 'data' events to client
  -> Client updates dataProviderStore
  -> Widgets re-render with live data
```

### Subscription Deduplication

Multiple widgets can subscribe to the same data stream. The store deduplicates:

```
ChartWidget subscribes to binance:BTC/USDT:candles:1h  -> ref count = 1
OrderBookWidget subscribes to binance:BTC/USDT:orderbook -> ref count = 1
Another ChartWidget subscribes to binance:BTC/USDT:candles:1h -> ref count = 2 (no new fetch)
ChartWidget unmounts -> ref count = 1 (stream stays open)
Last ChartWidget unmounts -> ref count = 0 (stream closed)
```

## Widget System

Widgets are React components rendered inside a `WidgetSimple` container that provides:
- Drag-and-drop positioning
- Resize handles (all edges and corners)
- Title bar with minimize, maximize, settings, close
- Group color indicator
- Z-index management (bring to front on click)

Widgets are resolved through a dynamic **WidgetRegistry**
(`packages/client/src/modules/registry.ts`), a Zustand store mapping a `type`
string to a `WidgetDefinition`. Built-ins register at startup
(`modules/builtinWidgets.tsx`); module widgets register at load time via the host
`TerminalAPI`. `TradingTerminal`, `WidgetMenu`, `WidgetSettingsManager` and
`WidgetSimple` all read the registry, so an unknown/disabled `type` renders an
`UnknownWidgetPlaceholder` instead of crashing. The widget `type` is a free-form
string (`WidgetSchema.type` = `z.string().min(1)`).

See [Widgets](widgets.md) for the full list and how to create new ones.

## Module System

Profitmaker is extensible through **modules** — npm packages (keyword
`profitmaker-module`) that add widgets (frontend) and/or services (backend) to a
running terminal. The contract lives in `@profitmaker/module-sdk`.

```
                 @profitmaker/module-sdk  (shared contract)
                 /                      \
      host (server)                      host (client)
  ModuleManager (packages/server)    module runtime (packages/client/src/modules)
  - bun add/remove installs          - initRuntime(): window.__PROFITMAKER__
  - validates manifest               - loadModules(): fetch list, import bundles,
  - mounts routes /api/modules/<id>    inject styles, call register(terminal)
  - serves bundle /modules/<id>      - WidgetRegistry + Module Store widget
  - BackendModuleContext (log,       - UnknownWidgetPlaceholder for missing types
    storage, jobs, io, ccxt)
```

- **Server** (`packages/server/src/modules`): `ModuleManager` installs/enables/
  disables modules, validates manifests, mounts each backend plugin under
  `/api/modules/<id>` (prefix stripped on dispatch), serves the frontend bundle at
  `/modules/<id>/bundle.js`, and gives backends a `BackendModuleContext`.
- **Client** (`packages/client/src/modules`): `initRuntime()` installs the host
  `TerminalAPI` (`window.__PROFITMAKER__`) before any bundle import; `loadModules()`
  fetches the installed list, checks `minTerminalApi`, injects styles, dynamically
  imports each bundle and calls `register(terminal)`. The **single React instance**
  is guaranteed by the SDK vite preset aliasing `react`/`zustand`/the SDK to host
  runtime shims.

See [Modules](modules.md) for the full contract, `docs/llms.txt` for a condensed
index, and `templates/module-template/` for a working example.

## Persistence

All Zustand stores use the `persist` middleware with localStorage:

| Store | localStorage Key | What's Persisted |
|-------|-----------------|------------------|
| `dashboardStore` | `dashboard-store` | Dashboards, widgets, active dashboard |
| `userStore` | `user-store` | Users, accounts (encrypted), active user |
| `dataProviderStore` | `data-provider-store` | Provider configs, fetch settings |
| `groupStore` | `group-store` | Widget groups, selected group |

Market data (candles, trades, orderbook) is NOT persisted -- it's fetched fresh on load.
