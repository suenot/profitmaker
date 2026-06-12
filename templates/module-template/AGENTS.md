# AGENTS.md — building a Profitmaker module

Operational guide for an agent (or human) creating, building, dev-loading,
publishing, and installing a Profitmaker terminal module, using this template as
the starting point. Pair this with `docs/modules.md` (API reference) at the repo
root.

## Mental model

A module is an npm package whose `package.json` has:
- the `profitmaker-module` keyword (how the store discovers it), and
- a `profitmaker` key — the **manifest**, validated by the host against
  `ModuleManifestSchema` from `@profitmaker/module-sdk`.

A module may ship a **frontend** (a widget bundle), a **backend** (an Elysia
plugin + background services), or both. The host:
- mounts the backend plugin under `/api/modules/<id>` (auth-protected),
- serves the frontend bundle at `/modules/<id>/bundle.js` (public),
- gives the backend a `BackendModuleContext` (log, storage, jobs, io, ccxt).

## 1. Scaffold

```bash
cp -r templates/module-template my-module
cd my-module
```

Edit `package.json`:
- `name` — `profitmaker-module-<id>` (or scoped `@you/profitmaker-module-<id>`).
- keep the `profitmaker-module` keyword.
- `profitmaker.id` — lowercase kebab-case, unique. This is your `<id>` in URLs
  and in widget types (`<id>.<widget>`).
- `profitmaker.frontend` / `profitmaker.backend` — drop whichever half you don't
  ship (the manifest requires at least one).
- If you publish outside this monorepo, change `@profitmaker/module-sdk` from
  `workspace:*` to a real version (e.g. `^1.0.0`).

## 2. Build

```bash
bun install
bun run build
```

Produces `dist/frontend/index.js` (+ `style.css`) and `dist/backend/index.js`.

Verify the build output exists:

```bash
ls dist/frontend/index.js dist/backend/index.js
bun run typecheck      # tsc --noEmit against the SDK types
```

## 3. Dev-load into a running terminal (no publish)

Build first, then point the server at the module's absolute path. It loads as a
dev module (`dev: true`), served from `dist/` with `Cache-Control: no-cache`, so
you can rebuild and reload without reinstalling.

```bash
# from packages/server:
DATABASE_URL=postgres://USER@localhost:5432/profitmaker \
API_TOKEN=test-token \
PROFITMAKER_DEV_MODULES=/abs/path/to/my-module \
bun src/index.ts
```

Multiple modules: colon-separate the paths
(`PROFITMAKER_DEV_MODULES=/a:/b`).

### Verify the backend (works today)

```bash
TOKEN=test-token
B=localhost:3001

# 1. module is listed
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules | grep '"id":"<id>"'

# 2. a backend route answers (route is root-relative in code: .get('/hello'))
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules/<id>/hello

# 3. the frontend bundle is served (public, no auth)
curl -s -i $B/modules/<id>/bundle.js | head -3   # 200 + application/javascript

# 4. toggle lifecycle
curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/api/modules/<id>/disable
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules/<id>/hello   # -> 404
curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/api/modules/<id>/enable
```

### Verify the frontend (TODO — until task #3 lands)

<!-- TODO(#3): once the client module runtime + loader ship, document:
     - open the terminal UI, confirm the widget appears in the add-widget menu
       under the "modules" category,
     - add it to a dashboard, assign a group, confirm ticker + heartbeat render,
     - confirm the settings panel persists `config.label`,
     - confirm hot-reload after `bun run build` (no-cache dev bundle). -->
Frontend runtime verification depends on the client module loader (task #3) and
is not yet documented here. Until then, verify the frontend only by build +
typecheck + that `bundle.js` is served.

## 4. Publish

```bash
# bump version in package.json, then:
npm publish
```

Requirements the store enforces on install:
- the `profitmaker-module` keyword is present,
- `package.json.profitmaker` validates against the manifest schema,
- `profitmaker.minTerminalApi` is satisfied by the host's `TERMINAL_API_VERSION`.

## 5. Install into a terminal

```bash
curl -X POST -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"name":"profitmaker-module-<id>"}' localhost:3001/api/modules/install
```

Or pin a version: `{"name":"...","version":"1.2.3"}`.

Lifecycle after install:
- `POST /api/modules/<id>/enable` / `.../disable` — start/stop at runtime, no
  restart.
- `POST /api/modules/<id>/upgrade`, `DELETE /api/modules/<id>` — run the npm
  operation and set `pendingRestart`; the new/removed code only fully applies
  after a server restart (Bun cannot evict an already-imported ES module).

## Gotchas

- **Routes are root-relative.** Define `.get('/hello')`, not
  `.get('/api/modules/<id>/hello')`. The host strips the mount prefix.
- **One React instance.** Import `react` normally; the vite preset aliases it to
  the host's instance. Never bundle your own React.
- **Storage is per-module JSON.** `ctx.storage` persists to a single file under
  the server's modules dir; treat it as small key/value state, not a database.
- **Jobs are auto-cleared on stop/disable.** Still return cleanly from `stop()`.
- **`permissions` are declarative.** They are surfaced in the store so users know
  what a module touches; they are not enforced at runtime (yet).
