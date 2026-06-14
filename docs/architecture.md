# Architecture

## Workspace Overview

Profitmaker v3 is a Bun workspace monorepo. The hosted terminal runs at
**terminal.marketmaker.cc** (backend **profitmaker-api.marketmaker.cc**,
ecosystem SSO at **auth.marketmaker.cc**); self-host installs run the same code.

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
| Auth | local sessions (bcrypt) or ecosystem SSO (RS256 JWT, `jose` + remote JWKS) | -- |
| Exchange keys | SSO: server-side in the `auth.marketmaker.cc` vault (AES-256-GCM), never in the browser. Self-host: inline per request, in memory only (not persisted) | -- |
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
- Bearer auth (API_TOKEN / local session / SSO JWT) + central-accounts
  credential resolution against the `auth.marketmaker.cc` vault
  (see [Central Accounts & SSO](#central-accounts--sso))
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

A provider instance exposes public market-data methods plus an optional
`trading` block: `createOrder`, `cancelOrder`, `fetchBalance`, `fetchMyTrades`,
`fetchOrders`, `fetchOpenOrders`, `fetchPositions`, and **`fetchLedger`**
(deposits/withdrawals/transfers/fees, backing the Transaction History widget).
Adding a trading method touches four layers: the contracts (`providerContract` +
`serverProviderContract` in `@profitmaker/types`), the server provider
(`ccxtProvider`) and its `/api/exchange/*` route, the client provider
(`ccxtServerProvider`), and the store action (`dataActions`).

## Central Accounts & SSO

Exchange API keys are **not** stored in the browser. In SSO mode they live in the
`auth.marketmaker.cc` vault (AES-256-GCM), and the terminal only ever holds a
credential id + the desired access level (`{ accountId, want: 'read' | 'trade' }`,
the `AccountRef` type). The profitmaker server resolves the decrypted keys
server-to-server, attaches them to the CCXT call, and discards them.

### Authentication

The server accepts three Bearer-token classes, resolved in order
(`middleware/requireUser.ts`, gated globally in `index.ts` `onBeforeHandle`):

1. **`API_TOKEN`** — server-to-server, maps to a single bootstrap user (agents/CLI/curl).
2. **Local session** — `bcrypt` register/login, 30-day session rows in PostgreSQL.
3. **SSO JWT** — an RS256 token from `auth.marketmaker.cc`, verified against the
   service's **public JWKS** (`jose` `createRemoteJWKSet`, alg pinned to RS256).
   No shared signing secret lives in this repo. On first login a per-user row is
   provisioned and bound to the SSO `sub` via `users.sso_user_id` (email-based
   takeover is refused — `ssoAuth.ts`).

Only the SSO path carries an ecosystem identity, so the central-accounts flows
are SSO-only (`getSsoContextFromRequest` returns null for the other two).

**Multi-login (client).** `sessionManager.ts` holds N ecosystem sessions (N JWTs)
in `localStorage` (`profitmaker.sso.sessions`), one active; `getSsoToken()`
returns the active token, so every consumer follows the active identity.
`ssoClient.ts` bootstraps silently on load by calling auth
`GET /api/v1/auth/session` with the shared `mm_session` cookie (terminal and auth
are both `*.marketmaker.cc` subdomains); "add login" re-prompts to append a second
identity without clobbering the first. `accountStore.ts` projects the active
identity's central accounts into the legacy `users[].accounts` shape so existing
widgets/selectors keep working; a credential id is what a group stores as its
`account`.

### Credential & request flow (SSO trading/read)

```
Browser (no secrets)                profitmaker server            auth.marketmaker.cc
  │  ccxtServerProvider builds            │                              │
  │  { config(routing-only),              │                              │
  │    accountId, want }                  │                              │
  ├── POST /api/exchange/fetchBalance ───>│  verify SSO JWT (JWKS)       │
  │   (Authorization: Bearer <SSO JWT>)   │  resolveAuthedConfig:        │
  │                                       │  reads {accountId, want}     │
  │                                       ├── POST /internal/exchange-── >│  decrypt keys for
  │                                       │   credentials                │  (user, credential,
  │                                       │   X-Internal-Secret          │   want); enforce grant
  │                                       │<── { api_key, api_secret, ───│  (403 if read-only
  │                                       │     access_level, read_only }│   and want='trade')
  │                                       │  attach keys → CCXT call      │
  │<── { success, provider, data } ───────│  (keys discarded; never sent │
  │                                       │   to the browser)            │
```

- **Two trust planes** (`services/authAccounts.ts`): the INTERNAL plane
  (`fetchCredentials` → `POST /api/v1/internal/exchange-credentials` with the
  `X-Internal-Secret` server secret) is the only place plaintext keys exist in
  the process; resolved creds are cached in memory for ≤60s, never persisted or
  logged. The USER plane (`proxyMeExchanges`) forwards account-management calls
  (`/api/accounts/*` → auth `/api/v1/me/exchanges*`) using the caller's own JWT,
  keeping the terminal a single API origin.
- **Access enforcement.** Trading endpoints force `want='trade'`; a read-only
  grant is rejected server-side (403), with a defense-in-depth re-check after the
  auth response. Reads use `want='read'`.
- **Legacy inline path.** Endpoints still accept inline `config.apiKey/secret`
  (self-host / incremental migration). When `accountId` is present, any inline
  secrets are ignored and the server-fetched keys win.

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

Most Zustand stores use the `persist` middleware with localStorage:

| Store | localStorage Key | What's Persisted |
|-------|-----------------|------------------|
| `dashboardStore` | `dashboard-store` | Dashboards, widgets, active dashboard |
| `dataProviderStore` | `data-provider-store` | Provider configs, fetch settings |
| `groupStore` | `group-store` | Widget groups, selected group |
| `dealsStore` | `deals-store` | Tracked deals / position history |

Identities and accounts are handled separately by the central-accounts layer:
`sessionManager` persists SSO sessions to `profitmaker.sso.sessions` (plain JSON,
not the `persist` middleware), and `accountStore` keeps per-session central-account
**metadata** in memory only — never the keys. The legacy `userStore`/`user-store`
(in-browser encrypted keys) is gone; `migrateLegacyLocalAccounts()` performs a
one-time push of any old localStorage accounts up to the auth vault.

Market data (candles, trades, orderbook) is NOT persisted -- it's fetched fresh on load.
