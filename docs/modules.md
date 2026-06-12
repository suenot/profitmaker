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

```bash
# list
curl -H 'Authorization: Bearer <token>' localhost:3001/api/modules
# install
curl -X POST -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"name":"profitmaker-module-example"}' localhost:3001/api/modules/install
# call a module route
curl -H 'Authorization: Bearer <token>' localhost:3001/api/modules/example/hello
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

<!-- ===================================================================== -->
<!-- TODO(#4): FRONTEND SECTIONS — fill once the client module runtime      -->
<!-- (task #3) is merged. The runtime/loader behaviour below is stubbed.    -->
<!-- ===================================================================== -->

## Frontend modules

> **TODO(#4):** Document the frontend module contract once the client runtime
> lands. Outline of what goes here:

- **Entry shape.** `export default defineModule({ id, widgets, setup?, dispose? })`
  from `@profitmaker/module-sdk`. <!-- TODO(#4): confirm against the shipped loader -->
- **The Terminal API** (`window.__PROFITMAKER__` / `getTerminal()`): `widgets`,
  `stores`, `hooks` (`useWidgetGroup`, `useMarketData`, `useModuleSocket`),
  `api.fetch`, `notify`. <!-- TODO(#4): member-by-member table like BackendModuleContext above -->
- **Writing a widget** (`WidgetDefinition`): `type`, `title`, `icon`, `category`,
  `defaultSize`, `Component`, `Settings?`, `HeaderActions?`.
  <!-- TODO(#4): full example with useWidgetGroup + useMarketData + Settings/updateConfig -->
- **The single-React-instance rule** and how the vite preset enforces it.
  <!-- TODO(#4): cross-link to the build section above -->
- **Loading lifecycle**: how the host fetches `/modules/<id>/bundle.js`, injects
  the stylesheet, calls `register(terminal)`, and unregisters on disable.
  <!-- TODO(#4): describe the actual loader behaviour from task #3 -->

## Module Store (UI)

> **TODO(#4):** Document the in-terminal Module Store widget (search, install,
> enable/disable, pendingRestart indicator) once task #3 ships it.
