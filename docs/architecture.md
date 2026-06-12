# Architecture

## Workspace Overview

Profitmaker v3 is a Bun workspace monorepo:

```
packages/
├── types/    @profitmaker/types        Shared TypeScript types, Zod schemas
├── core/     @profitmaker/core         CCXT providers, encryption, formatters, utils
├── sdk/      @profitmaker/module-sdk    Module SDK: TerminalAPI types, manifest schema, vite preset, runtime shims
├── server/   @profitmaker/server       Express 5 + Socket.IO backend (+ module manager)
└── client/   @profitmaker/client       React 18 + Vite frontend (+ widget registry, module runtime)
```

### Dependency Graph

```
@profitmaker/client
  ├── @profitmaker/core
  │     └── @profitmaker/types
  └── @profitmaker/module-sdk
        └── @profitmaker/types

@profitmaker/server
  ├── @profitmaker/core
  ├── @profitmaker/module-sdk
  └── @profitmaker/types
```

Both client and server depend on core and types. Cross-package imports use workspace protocol:

```json
// packages/core/package.json
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
| Backend | Express | 5.1 |
| Realtime | Socket.IO | 4.8 |
| Encryption | Web Crypto API (AES-256-GCM) | -- |
| Testing | Vitest (client), bun:test (core) | -- |
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

### @profitmaker/core

Business logic shared between client and server.

Key exports:
- `CCXTBrowserProviderImpl` -- CCXT running in the browser
- `CCXTServerProviderImpl` -- CCXT proxied through Express server
- `ccxtInstanceManager` -- caches and manages exchange instances
- `ccxtAccountManager` -- maps user accounts to exchange instances
- `encryption` -- AES-256-GCM encryption utilities
- `formatters` -- price, volume, percentage formatting
- `exchangeLimits` -- rate limit management per exchange
- `webSocketUtils` -- WebSocket connection helpers

### @profitmaker/server

Express 5 server with:
- REST endpoints for CCXT operations (`/api/exchange/*`)
- Socket.IO server for real-time data streaming
- CCXT instance caching (24h TTL, auto-cleanup every 10min)
- Bearer token authentication
- CORS proxy for exchanges that block browser requests

### @profitmaker/client

React SPA with:
- Vite dev server on port 8080
- Free-form dashboard with draggable, resizable widgets
- Zustand stores persisted to localStorage
- Multiple data provider support (browser CCXT, server CCXT)
- Widget grouping system (shared exchange/symbol context)

## Data Flow

### Market Data (Browser Provider)

```
User opens widget
  -> Widget subscribes via dataProviderStore.subscribe()
  -> Store finds best provider for exchange
  -> CCXTBrowserProviderImpl creates/reuses exchange instance
  -> CCXT fetches data directly from exchange API
  -> Data stored in dataProviderStore.marketData
  -> Widget reads from store, re-renders
```

### Market Data (Server Provider)

```
User opens widget
  -> Widget subscribes via dataProviderStore.subscribe()
  -> Store finds server provider for exchange
  -> CCXTServerProviderImpl sends HTTP POST to Express server
  -> Server creates/reuses CCXT instance
  -> CCXT fetches data from exchange API (no CORS issues)
  -> Response sent back to browser
  -> Data stored in dataProviderStore.marketData
  -> Widget reads from store, re-renders
```

### WebSocket Streaming (via Server)

```
Client connects to Socket.IO server
  -> Client sends 'authenticate' event with token
  -> Client sends 'subscribe' event (exchange, symbol, dataType)
  -> Server creates CCXT Pro WebSocket subscription
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
