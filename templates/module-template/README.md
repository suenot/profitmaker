# profitmaker-module-example

A reference Profitmaker terminal module. Copy this directory to start your own
module. It ships both halves of a module:

- **Backend** (`src/backend/index.ts`) — an Elysia plugin mounted under
  `/api/modules/example`, a 10s heartbeat job that persists a counter via
  `ctx.storage` and pushes it over the module's Socket.IO namespace, and a
  CCXT-backed `/ticker` route.
- **Frontend** (`src/frontend/index.tsx`) — a widget (`example.hello`) that
  reads its group's ticker via the host hooks and shows the live heartbeat,
  plus a settings panel.

A module is a normal npm package whose `package.json` carries a `profitmaker`
key (the manifest) and the `profitmaker-module` keyword (the discovery key).

## Layout

```
module-template/
  package.json        # manifest (profitmaker key) + scripts + deps
  tsconfig.json
  vite.config.ts      # uses profitmakerModule() preset from the SDK
  src/
    backend/index.ts  # export default { start(ctx) }
    frontend/index.tsx# export default defineModule({ id, widgets })
    frontend/style.css
  dist/               # build output (gitignored in real modules)
    backend/index.js
    frontend/index.js
    frontend/style.css
```

## SDK dependency: `workspace:*` vs a version

This template lives inside the Profitmaker monorepo, so it references the SDK as
a workspace package:

```json
"devDependencies": { "@profitmaker/module-sdk": "workspace:*" }
```

When you copy this module **out** of the monorepo to publish it, replace
`workspace:*` with a real version range, e.g. `"^1.0.0"`. `@profitmaker/module-sdk`
is only needed at build time (its vite preset and types); the runtime React /
zustand / SDK singletons come from the host, so they are **not** bundled.

## Build

```bash
bun install
bun run build          # builds frontend (vite) + backend (bun build)
# -> dist/frontend/index.js, dist/frontend/style.css, dist/backend/index.js
```

`bun run build:frontend` uses the SDK's vite preset, which aliases
`react` / `react-dom` / `zustand` / `@profitmaker/module-sdk` to runtime shims
that pull the host's singletons off `window.__PROFITMAKER__`. That guarantees a
single React instance, so the host hooks work and the bundle stays tiny.

`bun run build:backend` bundles the Elysia plugin for the Bun runtime.

## Develop against a running terminal (no publish)

Point the server at this directory with `PROFITMAKER_DEV_MODULES` (colon-separated
absolute paths). The module loads as `dev: true`, served from its own `dist/`
with `Cache-Control: no-cache`.

```bash
# from packages/server, with the template built:
DATABASE_URL=postgres://USER@localhost:5432/profitmaker \
API_TOKEN=test-token \
PROFITMAKER_DEV_MODULES=/abs/path/to/templates/module-template \
bun src/index.ts
```

Verify (server on port 3001 by default; these use a custom port if you set `PORT`):

```bash
# installed list includes "example"
curl -H 'Authorization: Bearer test-token' localhost:3001/api/modules

# backend route — note the route is /hello in code, mounted under the prefix
curl -H 'Authorization: Bearer test-token' localhost:3001/api/modules/example/hello

# persisted heartbeat counter
curl -H 'Authorization: Bearer test-token' localhost:3001/api/modules/example/state

# frontend bundle (public, no auth)
curl localhost:3001/modules/example/bundle.js
```

## Routes are relative to root

Inside `start(ctx)` you return an Elysia plugin whose routes are **relative to
root**:

```ts
new Elysia().get('/hello', () => ({ ok: true }))   // NOT '/api/modules/example/hello'
```

The host mounts the plugin under `/api/modules/<id>` and strips that prefix
before dispatching, so the request `/api/modules/example/hello` arrives at your
plugin as `/hello`. From the frontend, call the **full** path via the host's
authenticated fetch:

```ts
getTerminal().api.fetch('/api/modules/example/hello')
```

## Publish & install

```bash
npm publish            # package must keep the "profitmaker-module" keyword
```

Then in the terminal's Module Store (or via the API):

```bash
curl -X POST -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"name":"profitmaker-module-example"}' localhost:3001/api/modules/install
```

See `AGENTS.md` for the full scaffold → build → dev-load → publish → install
loop, and `docs/modules.md` in the repo root for the API reference.
