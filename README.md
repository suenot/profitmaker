![Profitmaker Story](public/images/generated/comic-strip-profitmaker.png)

# Profitmaker v3 -- Open Source Crypto Trading Terminal

[![License](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](./LICENSE)
[![Discord](https://img.shields.io/discord/430374279343898624.svg?color=4D64BA&label=discord)](https://discord.gg/2PtuMAg)

Modular, widget-based trading terminal with support for **100+ crypto exchanges** via [CCXT](https://github.com/ccxt/ccxt). All user state is managed through a REST API backed by PostgreSQL -- every dashboard, widget, group, and setting is persisted per-user.

**[Launch Terminal](https://terminal.marketmaker.cc)** | **[Docs](https://www.profitmaker.cc/docs/)** | **[Discord](https://discord.gg/2PtuMAg)** | **[Telegram](https://t.me/suenot)**

> The hosted terminal runs at **[terminal.marketmaker.cc](https://terminal.marketmaker.cc)** (single sign-on via `auth.marketmaker.cc`). Self-host it anywhere with the steps below.

---

## API-First Architecture

Profitmaker is an **API-managed project**. All functionality is exposed through a REST/WebSocket API on the backend, backed by **PostgreSQL** for persistent storage. This design enables:

- **LLM Integration** -- AI agents (Claude Code, etc.) can manage the entire platform via API: register users, create dashboards, arrange widgets, place orders, manage exchange accounts
- **Headless Mode** -- run the backend without the browser UI for automated trading, data collection, or bot integration
- **Multi-Client** -- the same API serves the React frontend, CLI tools, mobile apps, or third-party integrations
- **Per-User Persistence** -- every user gets their own dashboards, widgets, groups, exchange accounts, and settings stored in PostgreSQL

```bash
# Register a user and get a session token
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"secret123","name":"Trader"}'

# Use the token to create a dashboard
curl -s -X POST http://localhost:3001/api/dashboards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Dashboard"}'
```

See [docs/server-api.md](docs/server-api.md) for the full API reference, and
[docs/remote-control.md](docs/remote-control.md) for **driving a live terminal
from the backend** — REST mutations stream to open browsers in real time, and
UI verbs (switch tab, focus widget, read UI state) are executable over an API.
Run `bun scripts/control-demo.ts` to see it end to end.

AI agents drive the terminal over **MCP**, and humans/scripts over a
**`profitmaker` CLI** — both on one shared command registry (31 tools). See
[docs/mcp.md](docs/mcp.md) and [docs/cli.md](docs/cli.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18, TypeScript |
| Build | Vite 5 + SWC |
| Components | shadcn/ui (Radix UI + Tailwind CSS) |
| State | Zustand 5 + Immer, synced to API |
| Data Fetching | TanStack React Query |
| Charts | Night Vision (OHLCV candlestick) + Recharts (pie, bar) |
| Exchange API | CCXT 4.4 (100+ exchanges, REST + WebSocket) |
| Backend | **Bun + Elysia** (HTTP API) + Socket.IO (WebSocket streaming) |
| Database | **PostgreSQL** via Drizzle ORM |
| Auth | Local sessions (bcrypt) **or** ecosystem SSO via `auth.marketmaker.cc` (RS256 JWT, verified through public JWKS) |
| Exchange keys | **SSO/central accounts:** kept server-side in the `auth.marketmaker.cc` vault (AES-256-GCM) — the browser never holds secrets. **Self-host:** passed inline per request, held in memory for the call (not persisted) |
| Testing | Vitest + JSDOM |
| Monorepo | Bun workspaces (4 packages) |

## Features

### Widget System
- **Drag & drop** positioning with snap-to-grid alignment
- **Resize** from all 8 directions (edges + corners)
- **Maximize, minimize, collapse** -- collapsed widgets dock to bottom bar
- **Multiple dashboards** with tab navigation, create/duplicate/rename/delete
- **Right-click context menu** to add new widgets
- **Per-widget settings** stored per-user in database
- **Editable titles** -- double-click any widget header

### Trading Widgets

| Widget | Description |
|--------|-------------|
| **Chart** | OHLCV candlestick (Night Vision), 13 timeframes, infinite scroll |
| **Order Book** | Real-time bid/ask depth, spread display |
| **Trades** | Live trade feed with filtering, aggregated mode |
| **Order Form** | Market, limit, stop-loss, take-profit, trailing stop, iceberg; live ticker + real balance |
| **Portfolio** | Cross-account allocation — total value, per-asset breakdown, allocation donut (USD-valued) |
| **User Balances** | Detailed balances across all accounts with pie-chart breakdown |
| **User Trading Data** | My trades, open orders, positions (futures) |
| **Transaction History** | Deposits / withdrawals / transfers / fees from the exchange ledger |
| **Deals** | Deal tracking with entry/exit analysis, built from real trade history |

All widgets render **live data** — the demo/placeholder ("not ready") widgets were replaced with real exchange data wired through the data-provider layer.

### Data Provider System
- **CCXT Server** -- all market data + trading run through the Elysia backend (CORS-free, WebSocket via CCXT Pro); the browser has no CCXT
- **Pluggable server registry** -- the built-in `ccxt` provider plus module-supplied providers (incl. native napi bindings); priority-based resolution, `providerId` override
- **Automatic fallback** -- WebSocket to REST when an exchange lacks Pro support
- **Subscription deduplication** -- one connection per data stream, shared across widgets
- **Authenticated calls** -- balances, trades, orders, positions and the ledger resolve per account via `{ accountId }` (central accounts) or inline credentials; the server attaches the keys before calling CCXT
- **KuCoin Broker Pro** (hosted only) -- KuCoin trades routed through the hosted terminal are attributed to the MarketMaker broker for rebate; self-host installs are unaffected (no-op unless broker env vars are set)

### Security & Accounts
- **Authentication** -- local register/login (bcrypt, 30-day sessions in PostgreSQL), **or** ecosystem **single sign-on** via `auth.marketmaker.cc` (RS256 JWT verified through the public JWKS — no shared secret in this repo).
- **Central accounts (SSO mode)** -- exchange API keys live **server-side** in the `auth.marketmaker.cc` vault (AES-256-GCM). The terminal sends only `{ accountId, want: 'read' | 'trade' }` + the user's JWT; the backend fetches decrypted keys server-to-server. **The browser never holds secrets.**
- **Multiple simultaneous logins** -- hold several ecosystem identities at once and quick-switch the active one.
- **Per-account access levels** -- accounts can be shared read-only; trade operations on a read-grant are rejected server-side (403).
- **Self-host mode** -- without SSO, exchange keys are passed inline per request and held in memory for the call only (never persisted). Legacy browser-stored keys are migrated into the vault and purged; a persistent encrypted self-host store is on the roadmap.
- **Dual server auth** -- `API_TOKEN` for server-to-server + the user's JWT/session for browser calls (every `/api/*` requires a bearer token).

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) 1.0+
- [PostgreSQL](https://www.postgresql.org/) 15+

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | -- | PostgreSQL connection string (required) |
| `PORT` | `3001` | API server port |
| `API_TOKEN` | `your-secret-token` | Server-to-server auth token |

### Install & Run

```bash
# Clone
git clone https://github.com/suenot/profitmaker.git
cd profitmaker

# Install dependencies
bun install

# Set up database
export DATABASE_URL="postgresql://user:password@localhost:5432/profitmaker"
cd packages/server && bun db:push && cd ../..

# Start the API server (port 3001)
bun server:dev

# Start the frontend (port 8080)
bun dev
```

Open http://localhost:8080 -- register an account to get a default dashboard with 6 widgets.

### Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Vite dev server (port 8080) |
| `bun run build` | Production build |
| `bun server` | Start Elysia API server (port 3001) |
| `bun server:dev` | Start API server with auto-reload |
| `bun test` | Run tests (Vitest) |
| `bun lint` | ESLint check |
| `bun db:push` | Push schema to PostgreSQL (in packages/server) |
| `bun db:generate` | Generate migration files |
| `bun db:studio` | Open Drizzle Studio (database GUI) |

## Architecture

### Monorepo Structure

```
profitmaker/
├── packages/
│   ├── client/             # @profitmaker/client -- React frontend
│   │   └── src/
│   │       ├── components/   # Widgets, UI, AuthPage, AuthGate
│   │       ├── store/        # Zustand stores (synced to API)
│   │       ├── services/     # API client, apiSync, storeSync
│   │       └── hooks/        # Custom React hooks
│   ├── server/             # @profitmaker/server -- Elysia API
│   │   └── src/
│   │       ├── db/schema/    # Drizzle ORM (9 tables)
│   │       ├── routes/       # auth, dashboards, widgets, groups,
│   │       │                 # accounts, settings, providers,
│   │       │                 # exchange, websocket, proxy, health
│   │       ├── services/     # auth, ccxtCache, wsSubscriptions,
│   │       │                 # defaultDashboard
│   │       └── middleware/    # requireUser (session validation)
│   ├── types/              # @profitmaker/types -- shared types (incl. provider contracts)
│   └── sdk/                # @profitmaker/module-sdk -- module SDK
├── package.json            # Bun workspace root
└── vite.config.ts          # Frontend build config
```

### Database Schema

```
users
├── sessions              (auth tokens, 30-day expiry)
├── dashboards
│   └── widgets           (position, config, per-dashboard)
├── groups                (instrument linking)
├── exchange_accounts     (schema reserved; SSO keys live in the auth.marketmaker.cc vault)
├── data_providers        (ccxt-server provider configs)
├── user_settings         (key-value: theme, activeDashboardId, etc.)
└── widget_settings       (per-widget, per-user configs)
```

### Data Flow

```
Browser                          Server                      Database
  │                                │                            │
  ├── Login ──────────────────────>│── Verify password ────────>│
  │<── Token + user ──────────────│<── Session created ────────│
  │                                │                            │
  ├── Load state ─────────────────>│── Query dashboards, ──────>│
  │<── Dashboards, widgets, ──────│<── widgets, groups, ───────│
  │    groups, settings            │    settings, providers     │
  │                                │                            │
  ├── Drag widget ─── Zustand ───>│── PUT /api/widgets/:id ──>│
  │    (local state)  (debounced)  │    (position update)       │
  │                                │                            │
  ├── Subscribe data ─────────────>│── CCXT/Socket.IO ────────>│ Exchange
  │<── Real-time stream ──────────│<── Market data ────────────│ API
```

### API Endpoints

| Group | Endpoints | Description |
|-------|-----------|-------------|
| **Auth** | `POST /api/auth/register, login, logout` `GET /api/auth/me` | User authentication |
| **Dashboards** | `GET, POST, PUT, DELETE /api/dashboards` | CRUD per-user dashboards |
| **Widgets** | `GET, POST, PUT, DELETE /api/widgets` `PUT /api/widgets/batch` | CRUD + batch position update |
| **Groups** | `GET, POST, PUT, DELETE /api/groups` | Instrument linking groups |
| **Accounts** | `GET, POST, PUT, DELETE /api/accounts` | Exchange API accounts |
| **Settings** | `GET, PUT, DELETE /api/settings/:key` `PUT /api/settings` (bulk) | Per-user key-value settings |
| **Providers** | `GET, POST, PUT, DELETE /api/providers` | Data provider configs |
| **Exchange** | `POST /api/exchange/fetch*` `POST /api/exchange/watch*` | CCXT market data |
| **Proxy** | `POST /api/proxy/request` | CORS bypass proxy |
| **Health** | `GET /health` | Server health (no auth) |

Socket.IO (port 3002): `subscribe`, `unsubscribe`, `data`, `error`

## Supported Exchanges

100+ exchanges via CCXT including: Binance, Bybit, OKX, Coinbase, Kraken, Bitfinex, Gate.io, KuCoin, MEXC, Huobi, Bitget, and many more.

## Related Projects

- **[profitmaker.cc](https://profitmaker.cc/)** -- open source crypto terminal + modular server for custom metrics
- **[marketmaker.cc](https://marketmaker.cc/)** -- commercial trading platform with profitmaker integration

## Team

- **Eugen Soloviov** -- maintainer -- [GitHub](https://github.com/suenot) | [Telegram](https://t.me/suenot)

## StarMapper

<a href="https://starmapper.bruniaux.com/suenot/profitmaker?utm_source=map-embed&utm_medium=readme&utm_campaign=stargazer-map">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://starmapper.bruniaux.com/api/map-image/suenot/profitmaker?theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://starmapper.bruniaux.com/api/map-image/suenot/profitmaker?theme=light" />
    <img alt="StarMapper" src="https://starmapper.bruniaux.com/api/map-image/suenot/profitmaker" />
  </picture>
</a>

## Star History

<a href="https://www.star-history.com/?type=date&repos=suenot%2Fprofitmaker">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=suenot/profitmaker&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=suenot/profitmaker&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=suenot/profitmaker&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT License with Commons Clause.

**Allowed**: use for any purpose, modify, distribute, create products built with Profitmaker.

**Not allowed**: sell Profitmaker itself, offer it as a hosted service, create competing products based on it.

See [LICENSE](./LICENSE) for full text. For commercial licensing -- [Telegram](https://t.me/suenot) or [email](mailto:suenot@gmail.com).

---

[![MarketMaker.cc](public/images/generated/banner-marketmaker.png)](https://marketmaker.cc/)

**[MarketMaker.cc](https://marketmaker.cc/)** -- commercial trading platform with AI-powered analytics, automated bots, and Profitmaker integration.
