# Getting Started

There are two ways to use Profitmaker:

- **Hosted** — open **[terminal.marketmaker.cc](https://terminal.marketmaker.cc)** and sign in with the ecosystem single sign-on (`auth.marketmaker.cc`). Exchange API keys live server-side in the `auth.marketmaker.cc` vault (central accounts); the browser never holds secrets. Nothing to install.
- **Self-host** — clone the repo and run it yourself (steps below). Without SSO, exchange API keys are passed **inline per request and held in memory for the call only** (not persisted); a persistent encrypted self-host store is on the roadmap.

The rest of this page covers self-hosting.

## Prerequisites

- **Bun** 1.0+ -- runtime and package manager ([bun.sh](https://bun.sh))
- **Node.js** 18+ -- some dependencies still require it
- **Git**

## Install

```bash
git clone https://github.com/nickolaylavrinenko/profitmaker.git
cd profitmaker
bun install
```

`bun install` resolves all workspace dependencies across the four packages.

## Project Structure

```
profitmaker/
├── packages/
│   ├── types/    # @profitmaker/types -- shared TypeScript types + Zod schemas (incl. provider contracts)
│   ├── sdk/      # @profitmaker/module-sdk -- module SDK (widget/manifest/runtime)
│   ├── server/   # @profitmaker/server -- Elysia (Bun) + Socket.IO backend (+ provider registry)
│   └── client/   # @profitmaker/client -- React + Vite frontend
├── package.json  # Root workspace config
└── docs/         # This documentation
```

## Development

### Start the client (Vite dev server)

```bash
bun dev
```

Opens at **http://localhost:8080**. Hot module replacement enabled.

### Set up the database

The server needs PostgreSQL 15+. Point `DATABASE_URL` at an empty database and
push the schema once:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/profitmaker"
cd packages/server && bun db:push && cd ../..
```

### Start the server (required)

The terminal is **backend-required** — all market data and trading go through the
server, and the client gates rendering behind a reachable backend. Start it with
a Postgres URL and an API token:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/profitmaker \
API_TOKEN=test-token \
bun server:dev
```

Runs Elysia (HTTP) on **http://localhost:3001** and Socket.IO on **:3002**, with
file watching. On first load the client shows a `ConnectionScreen` until it can
reach this server (enter the URL + `API_TOKEN`, or serve client and server
same-origin).

### Both together

Open two terminals — the server first, then the client:

```bash
# Terminal 1 (server)
DATABASE_URL=postgresql://user:password@localhost:5432/profitmaker API_TOKEN=test-token bun server:dev

# Terminal 2 (client)
bun dev
```

## Build

```bash
bun run build
```

Produces a production Vite build for the client.

## Testing

```bash
# Run all tests (Vitest for client, bun:test for server)
bun test

# Run a specific test file
bun test packages/server/src/routes/proxy.test.ts
```

## Linting

```bash
bun lint
```

Runs ESLint on the client package.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port (Socket.IO runs on `PORT + 1`) |
| `API_TOKEN` | `your-secret-token` | Bearer token for server API authentication |
| `DATABASE_URL` | -- | Postgres connection string (**required** to boot the server) |
| `AUTH_URL` | `https://auth.marketmaker.cc` | Auth service base (JWKS verification + the `/api/accounts` user-plane proxy) |
| `AUTH_INTERNAL_URL` | `https://auth.marketmaker.cc` | Base for the server↔auth **internal** credential fetch; lets ops point it at a private address |
| `AUTH_INTERNAL_SECRET` | -- | Server↔auth shared secret for `POST /api/v1/internal/exchange-credentials`. **Must equal the auth service's `AUTH_INTERNAL_SECRET`.** Unset ⇒ the central-account `accountId` trading flow returns 503; the rest of the server still boots. Never log or commit it |
| `VITE_SERVER_URL` | -- | Client: server base URL; falls back to the page origin (prod) or `http://localhost:3001` (dev) |

The client defaults to a `ccxt-server` provider pointed at `VITE_SERVER_URL`
(else localhost:3001); there is no browser-side CCXT.

## First Run Checklist

1. `bun install`
2. Set up the database: `cd packages/server && bun db:push && cd ../..` (with `DATABASE_URL` exported)
3. Start the server (with `DATABASE_URL` + `API_TOKEN`) — see *Start the server* above
4. `bun dev` -- open http://localhost:8080
5. If the client can't reach the server you'll see the `ConnectionScreen` — enter the server URL + `API_TOKEN` and **Test connection**, or serve client and server same-origin
6. Once connected you'll see the default dashboard with Chart, Portfolio, Order Form, and Transaction History widgets
7. Right-click the canvas to add more widgets
8. (Optional) Set up a master password to encrypt API keys -- see [Security](security.md)
9. (Optional) Add exchange accounts in the user drawer to trade with real data
