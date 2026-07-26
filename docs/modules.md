# Modules

Profitmaker is extensible through **modules** — npm packages that add widgets
(frontend) and/or services (backend) to a running terminal. A module is
discovered by the `profitmaker-module` npm keyword and described by a manifest
embedded in its `package.json`. The host installs modules with `bun add`,
validates their manifest, mounts their backend routes under
`/api/modules/<id>`, and serves their frontend bundle from `/modules/<id>`.

> Starting point: copy `templates/module-template/` — it ships a working backend
> half and a widget, with build scripts and a vite config. See its `README.md`
> and `AGENTS.md` for the full build/dev/publish loop.

- The host extension API version is **`TERMINAL_API_VERSION`** (currently
  `1.0.0`), exported from `@profitmaker/module-sdk`. Modules declare a compatible
  range via `profitmaker.minTerminalApi`.

## Discovery & packaging

A module is a normal npm package. Two things make it a module:

- the **`profitmaker-module`** keyword (the authoritative discovery key — the
  Module Store searches npm for `keywords:profitmaker-module`), and
- a **`profitmaker`** key in `package.json` — the manifest.

Recommended package name: `profitmaker-module-<id>` or
`@scope/profitmaker-module-<id>`.

## Manifest reference

The `profitmaker` key is validated against `ModuleManifestSchema`
(`@profitmaker/module-sdk`) on install (server) and before loading a bundle
(client). A module must declare at least one of `frontend` or `backend`.

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `manifestVersion` | `1` | yes | — | Literal `1`. |
| `id` | string | yes | — | Lowercase kebab-case, must start with a letter (`^[a-z][a-z0-9-]*$`). Used in URLs and widget-type namespacing. |
| `displayName` | string | yes | — | Human-readable name. |
| `description` | string | no | `''` | Shown in the Module Store. |
| `minTerminalApi` | string | no | `'>=1.0.0'` | Semver range checked against `TERMINAL_API_VERSION`. |
| `permissions` | string[] | no | `[]` | Declarative (see below). |
| `frontend` | object | no\* | — | Frontend bundle descriptor. |
| `backend` | object | no\* | — | Backend entry descriptor. |

\* At least one of `frontend` / `backend` is required.

### `frontend`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `entry` | string | yes | — | Path inside the package to the ESM bundle, e.g. `dist/frontend/index.js`. Served at `/modules/<id>/bundle.js`. |
| `style` | string | no | — | Optional stylesheet, served at `/modules/<id>/style.css`. |
| `widgets` | object[] | no | `[]` | Display metadata for the store; runtime `terminal.widgets.register(...)` is authoritative. |

Each `widgets[]` entry: `type` (`<moduleId>.<widgetName>`), `title`,
`description?`, `category` (default `modules`).

### `backend`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `entry` | string | yes | — | Path to the backend ESM entry, e.g. `dist/backend/index.js`. Default-exports a `BackendModule`. |
| `routes` | string[] | no | `[]` | Informational list of mounted route suffixes. |
| `services` | string[] | no | `[]` | Informational list of long-running services. |

### `permissions`

Declarative only — surfaced in the Module Store so users see what a module
touches. **Not enforced at runtime** (yet). Allowed values:

| Permission | Meaning |
|------------|---------|
| `market-data` | reads public market data (candles/trades/orderbook/ticker) |
| `private-data` | reads private account data (balances/orders/positions) |
| `orders` | places or cancels orders |
| `network` | makes its own outbound network requests (backend) |
| `storage` | persists its own state via `ctx.storage` |
| `jobs` | runs background jobs via `ctx.jobs` |
| `provider` | registers a server-side data/trading provider via `ctx.providers` |

### Example

```jsonc
{
  "name": "profitmaker-module-example",
  "version": "0.1.0",
  "keywords": ["profitmaker-module"],
  "profitmaker": {
    "manifestVersion": 1,
    "id": "example",
    "displayName": "Example Module",
    "minTerminalApi": ">=1.0.0",
    "permissions": ["market-data", "storage", "jobs"],
    "frontend": {
      "entry": "dist/frontend/index.js",
      "style": "dist/frontend/style.css",
      "widgets": [{ "type": "example.hello", "title": "Example Hello" }]
    },
    "backend": { "entry": "dist/backend/index.js", "routes": ["/hello"] }
  }
}
```

## Backend modules

The backend entry default-exports a `BackendModule`:

```ts
import { Elysia } from 'elysia';
import type { BackendModule } from '@profitmaker/module-sdk';

const mod: BackendModule = {
  async start(ctx) {
    const routes = new Elysia().get('/hello', () => ({ ok: true }));
    return { routes };
  },
  async stop() { /* optional cleanup */ },
};
export default mod;
```

`start(ctx)` may return `{ routes }` (an Elysia plugin) or nothing. `stop()` is
optional; the host force-clears jobs on stop regardless.

### Routes are relative to root

The Elysia plugin you return defines routes **relative to root**:

```ts
new Elysia().get('/hello', ...)   // NOT '/api/modules/example/hello'
```

The host mounts the plugin under `/api/modules/<id>` and **strips that prefix**
before dispatching. A request to `/api/modules/example/hello` arrives at your
plugin as `/hello`. The dispatch route is a catch-all registered after the
built-in module-management routes, so paths like `/install`, `/enable` etc.
can never be shadowed by a module.

From the frontend, call the **full** path through the host's authenticated
fetch: `getTerminal().api.fetch('/api/modules/example/hello')`.

### `BackendModuleContext`

`start(ctx)` receives this context (`@profitmaker/module-sdk`):

| Member | Type | Description |
|--------|------|-------------|
| `id` | `string` | The module's manifest id. |
| `version` | `string` | Installed package version. |
| `log` | `{ info, warn, error }` | Console logger prefixed with `[module:<id>]`. |
| `routesPrefix` | `string` | `'/api/modules/<id>'` — the mount prefix (informational; your routes are still root-relative). |
| `io` | `ModuleSocketNamespace` | Socket.IO namespace `'/m/<id>'`. `io.emit(event, ...)` reaches clients connected to that namespace; `io.on('connection', ...)` for inbound. |
| `ccxt.getInstance(cfg)` | `Promise<exchange>` | Shared server-side CCXT access — same instance cache and rate-limit budgets as the terminal. `cfg`: `{ exchangeId, marketType?, sandbox?, apiKey?, secret?, password? }`. |
| `providers.register(factory)` | `Disposable` | Register a server-side data/trading provider (see **Provider modules** below). Auto-unregistered on stop/disable. |
| `providers.unregister(id)` | `boolean` | Remove a provider this module registered. |
| `storage` | `ModuleStorage` | Per-module persisted JSON: `get<T>(key)`, `set(key, value)`, `delete(key)`, `all()`. Backed by one file under the server's modules dir, written atomically (temp+rename) and debounced. Survives enable/disable; treat as small key/value state. |
| `jobs` | `ModuleJobs` | `every(ms, fn, name?)` and `once(ms, fn)` return a `Disposable`. **All jobs are force-cleared when the module stops or is disabled**, so a forgotten interval can't outlive the module. |
| `env.dataDir` | `string` | Absolute path to the module-state directory. |

#### Example using the full surface

```ts
const mod: BackendModule = {
  async start(ctx) {
    let n = (await ctx.storage.get<number>('count')) ?? 0;
    ctx.jobs.every(10_000, async () => {
      n += 1;
      await ctx.storage.set('count', n);
      ctx.io.emit('tick', n);          // -> clients on /m/<id>
      ctx.log.info('tick', n);
    });
    const routes = new Elysia()
      .get('/count', () => ({ n }))
      .get('/ticker', async ({ query }) => {
        const ex = await ctx.ccxt.getInstance({ exchangeId: String(query.exchange) });
        return ex.fetchTicker(String(query.symbol));
      });
    return { routes };
  },
};
export default mod;
```

## Provider modules

A **provider module** registers a server-side data/trading provider, so the
terminal can serve market data from something other than the built-in `ccxt` —
for example a different exchange SDK, an aggregator, or a **native binding** (a
Rust implementation compiled to a Node.js napi addon, installed via
`bun add your-native-pkg`). Nothing in the contract assumes pure JS.

### Registration

In `start(ctx)`, call `ctx.providers.register(factory)` with a
`ServerProviderFactory` (from `@profitmaker/module-sdk`):

```ts
import type { ServerProviderFactory } from '@profitmaker/module-sdk';

const factory: ServerProviderFactory = {
  id: 'mock',                       // stable id used for explicit selection + listing
  displayName: 'Mock Provider',
  supportedExchanges: ['mockex'],   // or '*' for all
  priority: 50,                     // lower wins; built-in ccxt is 100
  create: (config) => makeInstance(config), // -> ServerProviderInstance
};

const mod: BackendModule = {
  async start(ctx) {
    ctx.providers.register(factory); // auto-unregistered on stop/disable
  },
};
```

`create(config)` returns a `ServerProviderInstance` implementing
`fetchTicker/OrderBook/Trades/OHLCV/Balance`, `getCapabilities`, `getMarket`,
`watch(dataType, symbol, timeframe?)`, and an optional `trading` block (omit it
for a read-only provider). Methods return exchange-native payloads — the routes
pass them straight through and the client normalizes.

### Routing & priority

`/api/exchange/*` and the Socket.IO watch loop resolve a provider via
`registry.resolve(exchange, providerId?)`:

- **Explicit:** include `providerId` in the request body (or the `subscribe`
  payload) to force a provider.
- **By priority:** otherwise the lowest-`priority` provider whose
  `supportedExchanges` covers the exchange wins. The built-in `ccxt` is
  priority `100`, so a module provider with a lower number takes precedence for
  the exchanges it serves.

Every `/api/exchange/*` response carries a `provider` field reporting which
provider served it. `GET /api/providers/available` lists all registered
providers (`{ id, displayName, exchanges, priority, fromModule? }`).

### Lifecycle

All providers a module registers are **auto-unregistered when the module stops
or is disabled** — no manual cleanup needed.

A full working example lives in [`examples/provider-module`](../examples/provider-module).

## Runtime model

Modules are loaded once at server boot (and on install). Bun has **no reliable
ESM cache eviction**, so operations that change code on disk cannot hot-swap an
already-imported module — they set `pendingRestart` and take full effect on the
next server restart. Operations that only change *state* apply immediately.

| Operation | Code re-imported? | Routes/jobs | Restart needed? |
|-----------|-------------------|-------------|-----------------|
| `install` | yes (fresh import) | started immediately | no |
| `enable` | reuses loaded code | started immediately | no |
| `disable` | — | stopped + jobs cleared immediately | no |
| `upgrade` | no (on-disk only) | unchanged until restart | **yes** (`pendingRestart`) |
| `uninstall` | no (stays resident) | stopped + removed immediately | **yes** (`pendingRestart`) |

A module that throws during load or `start()` is recorded with an `error` and
left **installed but inactive** — a broken module never aborts server boot.

### Dev modules

For local development, point the server at one or more local module directories
(colon-separated absolute paths). They load as `dev: true`, served from their own
`dist/` with `Cache-Control: no-cache`, and are **not** written to the installed
modules state — rebuild and reload without reinstalling.

```bash
PROFITMAKER_DEV_MODULES=/abs/path/to/module-a:/abs/path/to/module-b \
DATABASE_URL=postgres://USER@localhost:5432/profitmaker API_TOKEN=test-token \
bun src/index.ts   # from packages/server
```

## Management API

All `/api/modules/*` routes require auth (Bearer `API_TOKEN` or a user session),
same as the rest of `/api/`. The bundle/asset routes under `/modules/*` are
**public** (a browser `<script>` loads them unauthenticated), matching the
host's static-asset design.

| Method & path | Body | Description |
|---------------|------|-------------|
| `GET /api/modules` | — | `{ modules: InstalledModule[], apiVersion }`. |
| `GET /api/modules/search?q=` | — | Proxies the npm registry for `keywords:profitmaker-module` (+ `q`); returns `{ results: [{ name, version, description, keywords }] }`. |
| `POST /api/modules/install` | `{ name, version? }` | `bun add --exact`, validate, start. `name` is validated against the npm name grammar (rejected with 400 otherwise). |
| `POST /api/modules/:id/enable` | — | Start the module at runtime. |
| `POST /api/modules/:id/disable` | — | Stop it (clears jobs, removes routes). |
| `POST /api/modules/:id/upgrade` | — | `bun update`; sets `pendingRestart`. |
| `DELETE /api/modules/:id` | — | `bun remove`; stops it, sets `pendingRestart`. |
| `ALL /api/modules/:id/*` | — | Dispatch to the module's own routes (prefix stripped). |
| `GET /modules/:id/bundle.js` | — | Frontend ESM bundle (`application/javascript`, no-cache). Public. |
| `GET /modules/:id/style.css` | — | Frontend stylesheet (`text/css`, no-cache). Public. |
| `GET /modules/:id/assets/*` | — | Other bundle assets (path-traversal guarded). Public. |

`InstalledModule`: `{ id, npmName, version, enabled, dev?, pendingRestart?, error?, manifest }`.

`$BASE` below is your terminal server — `localhost:3001` for local dev, or your
deployed host (e.g. the production API `https://profitmaker-api.marketmaker.cc`).

```bash
BASE=https://profitmaker-api.marketmaker.cc   # or localhost:3001 for local dev
# list
curl -H 'Authorization: Bearer <token>' $BASE/api/modules
# install
curl -X POST -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"name":"profitmaker-module-example"}' $BASE/api/modules/install
# call a module route
curl -H 'Authorization: Bearer <token>' $BASE/api/modules/example/hello
```

## Build & publish

A module is built with whatever toolchain you like; the SDK ships a vite preset
for the frontend and you can use `bun build` for the backend.

```bash
# frontend: vite + @profitmaker/module-sdk/vite preset -> dist/frontend/index.js
bun run build:frontend
# backend: bun build src/backend/index.ts --target=bun --outdir dist/backend
bun run build:backend
```

The vite preset aliases `react`, `react-dom`, `zustand` and
`@profitmaker/module-sdk` to runtime shims that pull the host's singletons off
`window.__PROFITMAKER__`, so there is exactly one React instance and your bundle
does not ship its own copies.

Publish with `npm publish` (keep the `profitmaker-module` keyword). When
developing inside this monorepo, reference the SDK as `workspace:*`; when
publishing standalone, pin a real version (e.g. `^1.0.0`).

---

## Frontend modules

A frontend module is an ESM bundle whose **default export is a `FrontendModule`**.
Build it with `defineModule` from `@profitmaker/module-sdk`:

```tsx
import { defineModule } from '@profitmaker/module-sdk';
import type { WidgetDefinition } from '@profitmaker/module-sdk';

const helloWidget: WidgetDefinition = { /* see below */ };

export default defineModule({
  id: 'example',                 // must match the manifest id
  widgets: [helloWidget],        // registered via terminal.widgets.registerMany
  setup: (terminal) => {},       // optional: extra registration / side effects
  dispose: () => {},             // optional: cleanup
});
```

When the host loads your bundle it calls `module.register(terminal)`, which
registers your `widgets[]` and runs `setup`. Your widget `type` strings are
namespaced `<moduleId>.<widgetName>` (e.g. `example.hello`); they appear in the
add-widget menu under the **Modules** section and render wherever a dashboard
references them.

### `WidgetDefinition`

The shape every widget (built-in or module) is described by
(`@profitmaker/module-sdk`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `string` | yes | `<moduleId>.<widgetName>`, globally unique. |
| `title` | `string` | yes | Default widget title (header + menu). |
| `icon` | `string` | no | lucide-react icon name (e.g. `'LineChart'`); the host resolves it and falls back to a puzzle icon for unknown names. |
| `category` | `string` | no | Menu section. Module widgets use `'modules'` (the only category surfaced for modules). |
| `defaultSize` | `{ width: number; height: number }` | yes | **Pixels.** A new widget is created at this size. |
| `showGroupSelector` | `boolean` | no | Show the group-selector circle in the header (default `true`). |
| `needsTransparentGroup` | `boolean` | no | Auto-assign the transparent group on creation (default `false`). |
| `Component` | `ComponentType<WidgetProps>` | yes | The widget body. |
| `Settings` | `ComponentType<WidgetSettingsProps>` | no | Rendered in the settings drawer; presence adds the gear button. |
| `HeaderActions` | `ComponentType<{ widgetId }>` | no | Extra buttons in the widget header. |

`WidgetProps` (passed to `Component`): `{ widgetId, groupId?, config, updateConfig }`.
`config` is the per-widget persisted object; `updateConfig(patch)` merges a patch
into it. `WidgetSettingsProps` (passed to `Settings`): `{ widgetId, groupId? }`.

### The Terminal API

The host installs `window.__PROFITMAKER__` (typed `TerminalAPI`) **before** any
module bundle is imported. Reach it with `getTerminal()`:

| Member | Type | Example |
|--------|------|---------|
| `apiVersion` | `string` | `getTerminal().apiVersion // '1.0.0'` |
| `React`, `ReactDOM`, `ReactDOMClient`, `jsxRuntime`, `jsxDevRuntime`, `zustand` | host singletons | You normally never touch these directly — the vite preset aliases `react`/`zustand` to them so your imports resolve to the host's instances. |
| `widgets.register(def)` | `(WidgetDefinition) => void` | `getTerminal().widgets.register(myWidget)` |
| `widgets.registerMany(defs)` | `(WidgetDefinition[]) => void` | done for you by `defineModule({ widgets })` |
| `widgets.unregister(type)` | `(string) => void` | `getTerminal().widgets.unregister('example.hello')` |
| `stores.useDataProviderStore` / `useGroupStore` / `useDashboardStore` / `useSettingsDrawerStore` | host Zustand stores | `getTerminal().stores.useDashboardStore.getState().updateWidgetConfig(id, { label })` |
| `hooks.useWidgetGroup(groupId?)` | `=> WidgetGroupContext` | resolves a group to `{ exchange?, symbol?, market?, account?, isComplete }` (`isComplete` ⇔ exchange **and** symbol set). |
| `hooks.useMarketData(opts)` | `=> { candles?, trades?, orderbook?, ticker? }` | ref-counted subscribe for the component's lifetime; reactive. |
| `hooks.useModuleSocket(moduleId)` | `=> ModuleSocket \| null` | Socket.IO to your backend namespace `/m/<id>`. |
| `api.fetch(path, init?)` | `=> Promise<Response>` | authenticated fetch; pass the **full** path. |
| `api.baseUrl` | `string` | the resolved terminal-server base. |
| `notify.success/error/info(message)` | `(string) => void` | host toast + notification history. |

**Recommended:** import the hooks directly from the SDK (a bare import) rather
than reaching through `getTerminal().hooks.*`. The SDK re-exports them with full
types, and the vite preset aliases the SDK to the runtime shim, so the same
import both typechecks and resolves to the host implementation at runtime:

```tsx
import { useWidgetGroup, useMarketData, useModuleSocket } from '@profitmaker/module-sdk';
```

`getTerminal().hooks.*` remains available and is equivalent — use it when you
already hold the `terminal` reference. Either way these are real React hooks —
call them unconditionally at the top of a component. The per-hook examples below
use the bare-import style.

#### `useWidgetGroup(groupId)`

```tsx
const group = useWidgetGroup(groupId);
// group: { exchange?, symbol?, market?, account?, isComplete }
if (!group.isComplete) return <div>Pick an exchange & symbol.</div>;
```

#### `useMarketData(opts)`

```tsx
const { ticker } = useMarketData({
  exchange: group.exchange!, symbol: group.symbol!,
  dataType: 'ticker', market: group.market, subscriberId: widgetId,
});
// dataType: 'candles' | 'trades' | 'orderbook' | 'ticker'
// returns the matching field (candles/trades/orderbook/ticker), reactively.
```

#### `useModuleSocket(moduleId)`

```tsx
const socket = useModuleSocket('example');
React.useEffect(() => {
  if (!socket) return;
  const onBeat = (n: number) => setHeartbeat(n);
  socket.on('heartbeat', onBeat);
  return () => socket.off('heartbeat', onBeat);
}, [socket]);
```

#### `api.fetch(path, init?)` — calling your backend

Backend routes are root-relative in your plugin, but you call the **full**
mounted path from the frontend; the host attaches the Bearer token:

```tsx
const res = await getTerminal().api.fetch('/api/modules/example/hello');
const data = await res.json();
```

#### `notify`

```tsx
getTerminal().notify.success('Saved');
getTerminal().notify.error('Something went wrong');
```

### Reading & writing widget config

The widget `Component` receives `config` and `updateConfig`:

```tsx
function MyWidget({ config, updateConfig }: WidgetProps) {
  const label = (config.label as string) ?? 'Default';
  return <button onClick={() => updateConfig({ label: 'clicked' })}>{label}</button>;
}
```

A `Settings` panel receives only `{ widgetId, groupId? }` (no `updateConfig`).
Persist config through the dashboard store's convenience method, which locates
the widget across dashboards:

```tsx
const store = getTerminal().stores.useDashboardStore as any;
store.getState().updateWidgetConfig(widgetId, { label: 'new label' });
// reactive read:
const label = store((s: any) =>
  s.dashboards.flatMap((d: any) => d.widgets).find((w: any) => w.id === widgetId)?.config?.label ?? '');
```

The `templates/module-template` widget shows both patterns end to end.

### Theming: the `terminal-*` class vocabulary

Module widgets render inside the host, which uses Tailwind with a `terminal-*`
palette mapped to CSS variables (so widgets follow the active theme). Prefer
these classes over hard-coded colors:

| Class | Role |
|-------|------|
| `bg-terminal-bg` | app background |
| `bg-terminal-widget` | widget surface (often used with an opacity, e.g. `bg-terminal-widget/40`) |
| `bg-terminal-accent` | hover / accent fills (e.g. `hover:bg-terminal-accent/60`) |
| `text-terminal-text` | primary text |
| `text-terminal-muted` | secondary / muted text |
| `border-terminal-border` | borders & dividers |

Example:

```tsx
<div className="p-3 bg-terminal-widget/40 border border-terminal-border rounded-md text-terminal-text">
  <span className="text-terminal-muted">Label</span>
</div>
```

You may also ship your own stylesheet (`frontend.style`) — the host injects it
at `/modules/<id>/style.css` when your bundle loads. Scope your selectors (e.g.
prefix with your module id) to avoid clashing with the host or other modules.
See `docs/theming.md` for the full palette and theme variables.

### The single-React-instance rule

A module must use the **host's** React, not its own — two React copies break
hooks. The SDK vite preset (`@profitmaker/module-sdk/vite`) enforces this by
aliasing `react`, `react-dom`, `react/jsx-runtime`, `zustand` and
`@profitmaker/module-sdk` to runtime shims that re-export
`window.__PROFITMAKER__.*`. So you write ordinary imports (`import React from 'react'`)
and the built bundle pulls the host singletons at runtime — and stays tiny
(a few KB), because React/zustand are never bundled. See **Build & publish**
above.

### Loading lifecycle

What the host does, in order:

1. **Boot**: `initRuntime()` installs `window.__PROFITMAKER__`, then (after mount)
   `loadModules()` runs.
2. **Fetch**: `GET /api/modules`; for each **enabled** module with a `frontend`,
   check `minTerminalApi` against `TERMINAL_API_VERSION` (incompatible → recorded
   as an error, skipped).
3. **Style**: if `frontend.style` is set, inject
   `<link href="/modules/<id>/style.css?v=<version>">`.
4. **Import**: `import('/modules/<id>/bundle.js?v=<version>')` and call
   `bundle.default.register(window.__PROFITMAKER__)`.
5. **Register**: your widgets enter the registry; they immediately appear in the
   add-widget menu under **Modules** and render in any dashboard that references
   their `type`.
6. **Isolation**: each module loads in its own try/catch. A module that throws is
   recorded (shown in the Module Store) and notified, but never breaks the
   terminal or other modules.
7. **Disable / uninstall**: the host unregisters the module's widget types, so any
   open widgets of those types fall back to a placeholder
   ("Widget '<type>' is not installed or its module is disabled" + a remove
   button). Re-enabling re-registers from the cached bundle (an already-imported
   ESM bundle can't be re-evaluated in-session).

A dashboard persisted with a widget whose module is absent/disabled renders the
same placeholder instead of crashing — the dashboard schema accepts any widget
`type` string.

## Module Store (UI)

The terminal ships a **Module Store** widget (`type: 'system.moduleStore'`) for
managing modules without leaving the UI. It has two tabs:

- **Browse** — searches npm (`GET /api/modules/search?q=`) for
  `keywords:profitmaker-module`; each result shows name / version / description
  and an **Install** button (`POST /api/modules/install`), after which the new
  module's frontend is loaded immediately (no page reload).
- **Installed** — lists installed modules (`GET /api/modules`) with an
  enable/disable switch (`POST .../enable|disable`), version, **dev** and
  **restart-pending** badges, an uninstall button (`DELETE /api/modules/:id`),
  and any load error (both backend `error` and client-side frontend load
  failures).

Disabling/uninstalling here unregisters the module's widget types client-side,
so open widgets switch to the placeholder. Operations that need a server restart
(`upgrade`, `uninstall`) surface a restart-pending badge.

### Built-in widgets are modules too

The **Installed** tab lists every built-in widget above the npm modules — one
entry per widget (Chart, Order Book, Leverages, …), each with a switch. Off means
the widget type is unregistered: it leaves the add-widget menu and open instances
fall back to the placeholder, exactly as for a disabled module. There is no
uninstall — built-ins ship with the terminal, so the switch is the only control.

The **Module Store itself is locked on** (`locked: true` in its definition, shown
as a padlock instead of a switch): switching it off would remove the only UI that
can switch anything back on.

Two implementation notes worth knowing before changing this:

- **The toggle does not use `/api/modules/*`.** Those routes are operator-gated
  (`MODULES_ADMIN_TOKEN`) because installing a module runs third-party code with
  the server's privileges. Toggling a built-in runs nothing, so it is a per-user
  preference: it lives in user settings under `builtinWidgets.disabled` (a string
  array of widget types) via `GET/PUT /api/settings/:key`, and needs only a normal
  session. Client side that is `modules/builtinModules.ts`.
- **The catalog lives in `modules/builtinCatalog.ts`, not `builtinWidgets.tsx`.**
  `builtinWidgets` imports the Module Store widget (it is one of the built-ins),
  so having the store import the catalog back from there is an import cycle — one
  that fails at runtime with "Cannot access 'ModuleStoreWidget' before
  initialization". The catalog also keeps the definitions a disabled widget is
  restored from, since unregistering drops them from the widget registry.
