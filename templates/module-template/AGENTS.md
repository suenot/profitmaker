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

These run verbatim against this template (id `example`); set `MODULE_ID` to your
own id when you change it.

```bash
TOKEN=test-token
B=localhost:3001
MODULE_ID=example

# 1. module is listed
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules | grep "\"id\":\"$MODULE_ID\""

# 2. a backend route answers (route is root-relative in code: .get('/hello'))
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules/$MODULE_ID/hello

# 3. the persisted state route answers
curl -s -H "Authorization: Bearer $TOKEN" $B/api/modules/$MODULE_ID/state

# 4. the frontend bundle + stylesheet are served (public, no auth)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/modules/$MODULE_ID/bundle.js
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' $B/modules/$MODULE_ID/style.css

# 5. toggle lifecycle (disable -> route 404 -> enable)
curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/api/modules/$MODULE_ID/disable
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" $B/api/modules/$MODULE_ID/hello   # -> 404
curl -s -X POST -H "Authorization: Bearer $TOKEN" $B/api/modules/$MODULE_ID/enable
```

### Verify the frontend (in the browser)

With the server running (dev-loaded as above) and the terminal client open
(`bun dev` from `packages/client`). Make sure the client talks to this server:
configure a `ccxt-server` data provider pointing at the server URL + `API_TOKEN`,
or serve client and server same-origin.

1. **Widget in the menu.** Right-click the workspace → the add-widget menu shows
   a **Modules** section containing **Example Hello**.
2. **Renders live data.** Add it, assign a group with an exchange + symbol. The
   widget shows `exchange · symbol`, the ticker `last` (via `useMarketData`), and
   `backend heartbeat: <n>` ticking every 10s (the backend job pushing over the
   module's Socket.IO namespace).
3. **Settings persist.** Click the widget's gear → edit **Label** → the header
   value (and `config.label`) update and survive a reload.
4. **Disable → placeholder.** Add the **Module Store** widget
   (`system.moduleStore`) → Installed tab → toggle **Example Module** off. The
   open widget switches to "Widget 'example.hello' is not installed or its module
   is disabled". Toggle back on → it renders again.
5. **Hot-reload.** Edit `src/frontend/index.tsx`, `bun run build`, reload the
   browser — the new bundle is served (dev modules are `Cache-Control: no-cache`).
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
