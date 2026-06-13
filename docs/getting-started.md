# Getting Started

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

### Start the server (required)

The terminal is **backend-required** — all market data and trading go through the
server, and the client gates rendering behind a reachable backend. Start it with
a Postgres URL and an API token:

```bash
DATABASE_URL=postgres://USER@localhost:5432/profitmaker \
API_TOKEN=test-token \
bun --cwd packages/server dev
```

Runs Elysia (HTTP) on **http://localhost:3001** and Socket.IO on **:3002**, with
file watching. On first load the client shows a `ConnectionScreen` until it can
reach this server (enter the URL + `API_TOKEN`, or serve client and server
same-origin).

### Both together

Open two terminals — the server first, then the client:

```bash
# Terminal 1 (server)
DATABASE_URL=postgres://USER@localhost:5432/profitmaker API_TOKEN=test-token bun --cwd packages/server dev

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
| `VITE_SERVER_URL` | -- | Client: server base URL; falls back to the page origin (prod) or `http://localhost:3001` (dev) |

The client defaults to a `ccxt-server` provider pointed at `VITE_SERVER_URL`
(else localhost:3001); there is no browser-side CCXT.

## First Run Checklist

1. `bun install`
2. Start the server (with `DATABASE_URL` + `API_TOKEN`) — see *Start the server* above
3. `bun dev` -- open http://localhost:8080
4. If the client can't reach the server you'll see the `ConnectionScreen` — enter the server URL + `API_TOKEN` and **Test connection**, or serve client and server same-origin
5. Once connected you'll see the default dashboard with Chart, Portfolio, Order Form, and Transaction History widgets
6. Right-click the canvas to add more widgets
7. (Optional) Set up a master password to encrypt API keys -- see [Security](security.md)
8. (Optional) Add exchange accounts in the user drawer to trade with real data
