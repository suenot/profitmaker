# Self-host from source

This page runs the whole stack on your machine: PostgreSQL, the server and the
client in dev mode. If you only want it running, [Docker](docker.md) is
shorter.

## What you need

- [Bun](https://bun.sh) 1.1 or newer
- PostgreSQL 15 or newer
- Git

## 1. Get the code

```bash
git clone https://github.com/suenot/profitmaker.git
cd profitmaker
bun install
```

`bun install` at the repo root links every workspace: `packages/*`,
`templates/*` and `modules/*`.

## 2. Create the database

```bash
createdb profitmaker
export DATABASE_URL="postgres://$USER@localhost:5432/profitmaker"
cd packages/server && bun run db:migrate && cd ../..
```

`db:migrate` applies the migration files committed in the repo. Use it rather
than `db:push`, which diffs the schema against your database and may drop
columns.

## 3. Pick an access token

The server refuses API calls without a token. Make one:

```bash
export API_TOKEN=$(openssl rand -hex 32)
echo "$API_TOKEN"
```

There is no default token. If `API_TOKEN` is empty, token access is off and
only signed-in users get in.

## 4. Start the server

```bash
DATABASE_URL="$DATABASE_URL" API_TOKEN="$API_TOKEN" bun run server:dev
```

The HTTP API listens on `http://localhost:3001`, Socket.IO on `:3002`. Check it:

```bash
curl http://localhost:3001/health
```

## 5. Start the client

In a second terminal:

```bash
bun run dev
```

Open `http://localhost:8080`.

The first time, the server rejects the browser because it has no token yet. A
yellow banner says so. Click **Enter token**, paste your `API_TOKEN`, save. The
token is kept in this browser's local storage, and the chart starts loading.

To skip that step, put the token into the client build instead:

```bash
VITE_API_TOKEN="$API_TOKEN" bun run dev
```

Do this only for a terminal that you alone use. Anything in `VITE_*` ends up in
the JavaScript that the browser downloads.

## 6. Production build

```bash
bun run build                       # builds packages/client/dist
DATABASE_URL=... API_TOKEN=... bun run server
```

In production the server also serves the built client from `STATIC_DIR`
(default `packages/client/dist`), so the browser and the API share one origin.
Set `ALLOWED_ORIGINS` to that origin, because Socket.IO on `PORT + 1` is always
a different origin. All settings are in [Configuration](configuration.md).

## Tests and checks

```bash
bun run test        # all packages
bun run typecheck
bun run lint        # client
```

## Repo layout

```
profitmaker/
├── packages/
│   ├── types/    shared TypeScript types and Zod schemas
│   ├── sdk/      @profitmaker/module-sdk, the module SDK
│   ├── server/   Bun + Elysia API, Socket.IO, CCXT, module host
│   ├── client/   React + Vite terminal
│   ├── mcp/      MCP server for AI agents
│   └── cli/      the profitmaker command
├── templates/    module template used by `profitmaker module scaffold`
├── modules/      your own modules live here
└── docs/         this documentation
```

## Next

- [Build your first dashboard](guide-first-dashboard.md)
- [Drive the terminal with an AI agent](guide-ai-agent.md)
- [Write your first module](guide-first-module.md)
