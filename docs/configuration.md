# Configuration

Everything is set through environment variables. Bun loads
`packages/server/.env` when the server starts through the repo scripts; `packages/server/.env.example` lists the
same variables with comments.

## Server

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | none, required | PostgreSQL connection string. The server does not start without it. |
| `PORT` | `3001` | HTTP port. Socket.IO listens on `PORT + 1`. |
| `API_TOKEN` | empty (off) | Static bearer token for scripts, agents and a self-hosted browser. It maps to the bootstrap user. Empty means token access is off, not that some default works. |
| `ALLOWED_ORIGINS` | localhost dev origins | Comma-separated browser origins allowed to open Socket.IO. Set it to your terminal's public origin in production. |
| `ALLOW_REGISTRATION` | off | Set to `1` to allow sign-up at `POST /api/auth/register`. Every local account has full access, so keep it off on a server the internet can reach. |
| `STATIC_DIR` | `packages/client/dist` | Built client that the server serves next to the API. |
| `MODULES_DIR` | `packages/server/.modules` | Where installed modules and `modules.json` live. |
| `MODULES_ADMIN_TOKEN` | empty | Operator token for installing, updating and removing modules. The browser sends it from the **Operator token** field in the Module Store. With no token and no SSO admin, module management answers 503. |
| `PROFITMAKER_DEV_MODULES` | empty | Absolute path to a module folder to load live in dev mode. See [Write your first module](guide-first-module.md). |

## Single sign-on (MarketMaker accounts)

Only needed if your server accepts MarketMaker logins. A plain self-host can
leave all of these unset.

| Variable | Default | What it does |
|---|---|---|
| `AUTH_URL` | `https://auth.marketmaker.cc` | Auth service. Its JWKS verifies sign-in tokens. |
| `AUTH_AUDIENCE` | empty | Expected `aud` claim. Set it once the auth service issues tokens scoped to the terminal. |
| `AUTH_REQUIRED_SERVICE` | empty | If set, a token must carry a role for this service. |
| `AUTH_VERIFY_ISSUER` | off | `1` also checks the token's `iss` against `AUTH_URL`. |
| `AUTH_INTERNAL_URL` | `AUTH_URL` host | Address for server-to-auth calls that fetch stored exchange keys. |
| `AUTH_INTERNAL_SECRET` | empty | Shared secret for those calls. Without it, trading with stored accounts answers 503. Keep it out of logs and git. |
| `MODULES_ADMIN_SERVICE` | `profitmaker` | Service whose admin role may manage modules. |
| `USAGE_METERING_ENABLED` | `0` | Usage analytics for the hosted service. |

## Client (build time)

`VITE_*` values are baked into the JavaScript at build time. The browser can
read them, so never put a token there for a terminal other people use.

| Variable | Default | What it does |
|---|---|---|
| `VITE_SERVER_URL` | page origin in production, `http://localhost:3001` in dev | Where the client finds the server. |
| `VITE_API_TOKEN` | empty | Token the client sends when nobody is signed in. Handy for a personal terminal. |
| `VITE_AUTH_URL` | `https://auth.marketmaker.cc` | Auth service address for the sign-in button. |

The client looks for a token in this order: a MarketMaker sign-in, the token
saved in the provider settings, the token typed into the **Enter token** form
(kept in local storage as `profitmaker.apiToken`), then `VITE_API_TOKEN`.

## CLI and MCP

| Variable | Default | What it does |
|---|---|---|
| `PROFITMAKER_URL` | `http://localhost:3001` | Server the `profitmaker` CLI and MCP server talk to. |
| `PROFITMAKER_TOKEN` | empty | Bearer token they send. Usually your `API_TOKEN`. |

## How a request is authenticated

`/health` and `/api/auth/*` are open. Every other route needs
`Authorization: Bearer <token>`. The server tries the token as:

1. the `API_TOKEN`,
2. a local session from `/api/auth/login` (valid 30 days),
3. a MarketMaker sign-in token, checked against the auth service's keys.

No token gives `401 Access token required`. A token that matches none of
these gives `403 Invalid token`.
