# Profitmaker API Reference

Profitmaker is an **API-first, API-managed** platform. All user state (dashboards, widgets, groups, exchange accounts, settings) is stored in **PostgreSQL** and managed through REST APIs. LLM agents, CLI tools, bots, and custom integrations can control the entire platform programmatically.

## Server

- **HTTP API**: `http://localhost:3001` (Bun + Elysia)
- **WebSocket**: `http://localhost:3002` (Socket.IO)
- **Database**: PostgreSQL (via Drizzle ORM)

```bash
# Set up database
export DATABASE_URL="postgresql://user:password@localhost:5432/profitmaker"
cd packages/server && bun db:push && cd ../..

# Start the server
bun server:dev

# Health check
curl http://localhost:3001/health
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | -- | PostgreSQL connection string (required) |
| `PORT` | `3001` | HTTP API port |
| `API_TOKEN` | `your-secret-token` | Server-to-server auth token |
| `MODULES_ADMIN_TOKEN` | _(unset)_ | Operator shared secret for the module lifecycle routes (sent as the `X-Modules-Admin-Token` header). Optional when SSO admins exist — a caller with an `admin`/`superuser` role for `MODULES_ADMIN_SERVICE` is authorized without it. With neither path available, module management fails closed (`503`). See [docs/modules.md](modules.md). |
| `MODULES_ADMIN_SERVICE` | `profitmaker` | SSO service whose `admin`/`superuser` role authorizes the module lifecycle routes. Roles are granted in the auth-service admin UI. |

## Authentication

Every `/api/*` route (except `/api/auth/*`) and `/ws` requires a `Bearer` token.
A token is resolved in this order: **`API_TOKEN`** → **local session token** →
**SSO JWT** (verified against the auth service's public JWKS). The first match wins;
none → `401` (missing) or `403` (present but invalid).

1. **Session token** (for users) -- obtained via `/api/auth/login` or `/api/auth/register`
2. **API token** (for server-to-server) -- set via `API_TOKEN` env var
3. **SSO JWT** (ecosystem users) -- see [Ecosystem SSO](#ecosystem-sso-authmarketmakercc) below

```bash
# Register a new user (creates default dashboard with 6 widgets)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"secret123","name":"Trader"}'
# Response: { "user": { "id": "uuid", "email": "...", "name": "..." }, "token": "session-uuid" }

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader@example.com","password":"secret123"}'

# Use the token for all subsequent requests
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

All endpoints except `/health` and `/api/auth/*` require authentication.

### Single-user bootstrap (API token)

The `API_TOKEN` is not just for server-to-server calls — it transparently resolves
to a **single bootstrap user** (`default@local`, created lazily on first use). This
means a token-only caller (an agent, a script, `curl`) can use **every** user-scoped
route exactly like a logged-in user, with no registration or login step:

```bash
# No login needed — the API token IS a user.
curl http://localhost:3001/api/dashboards -H "Authorization: Bearer $API_TOKEN"
curl -X POST http://localhost:3001/api/dashboards \
  -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Agent Dashboard"}'
```

Real session tokens continue to work unchanged and are scoped to their own user.

### Ecosystem SSO (auth.marketmaker.cc)

profitmaker also accepts **SSO tokens** from the MarketMaker ecosystem auth
service. A bearer token resolves in this order: `API_TOKEN` (→ bootstrap user) →
local session token → **SSO JWT**. SSO JWTs are RS256, verified against the
service's **public JWKS** (`https://auth.marketmaker.cc/.well-known/jwks.json`) —
no shared secret is needed or stored. On first SSO login a local user row is
auto-provisioned and **explicitly bound** to the token's `sub` (the auth-service
user id), so each ecosystem user gets their own dashboards/widgets/groups.

```bash
# A valid SSO JWT works on every user-scoped route, just like a session token.
curl http://localhost:3001/api/dashboards -H "Authorization: Bearer <sso-jwt>"
```

The browser obtains the JWT silently via the shared `*.marketmaker.cc` session
cookie — see the client SSO flow and [docs/remote-control.md](remote-control.md).

| Env var | Default | Meaning |
|---------|---------|---------|
| `AUTH_URL` | `https://auth.marketmaker.cc` | Auth service base (JWKS lives at `/.well-known/jwks.json`). Override for dev/staging. |
| `AUTH_REQUIRED_SERVICE` | _(unset)_ | When set (e.g. `profitmaker`), the JWT must carry a role for that service in its `roles`/`services` claim. Default: any authenticated ecosystem user is allowed. |
| `AUTH_VERIFY_ISSUER` | _(unset)_ | Set to `1` to also require the JWT `iss` to equal `AUTH_URL`. Off by default because the auth service currently issues ecosystem-wide tokens without `iss`. |

The client exposes the same env knob as `VITE_AUTH_URL` (defaults to the public
auth URL).

**Production smoke test** (run after deploy to terminal.marketmaker.cc — needs a real
ecosystem account):

1. Log in at any `*.marketmaker.cc` site (or directly at auth.marketmaker.cc) so
   the shared `mm_session` cookie is set.
2. Open `https://terminal.marketmaker.cc`. The top bar should show your username +
   logout (not "Login with MarketMaker"); the browser console shows a
   `GET /api/v1/auth/session → 200`.
3. Create a dashboard in the UI; confirm it persists per-user (a second
   ecosystem account sees its own, separate dashboards).
4. Log out → the chip reverts to the login button and the shared cookie is
   cleared (you're logged out of the other subdomains too).

Locally this path is verified with a generated RS256 keypair + a mock JWKS
(`AUTH_URL`/`VITE_AUTH_URL` pointed at the mock): a crafted JWT passes the gate,
auto-provisions a user, and a forged-key token is rejected with `403`.

#### Trust model

What the server trusts and how, stated plainly:

- **Signature + freshness.** A token is accepted only if it is signed by a key in
  the auth service's JWKS, the algorithm is **RS256** (pinned — an `alg` of
  anything else, e.g. `HS256`, is rejected), and it is unexpired.
- **Shape.** The token must carry `sub`, `email`, and a `roles`/`services` object.
  A token lacking the role map is not an ecosystem session token and is rejected,
  so the accepted set is narrower than "any RS256 token the auth service signed".
- **No issuer/audience binding yet.** The auth service issues ecosystem-wide
  tokens without `iss`/`aud`, so we cannot bind to them today. If it starts
  setting `iss`, set `AUTH_VERIFY_ISSUER=1` to also require `iss == AUTH_URL`.
- **Identity binding (no email takeover).** A local account is bound to **one**
  SSO identity via `users.sso_user_id` (the JWT `sub`). Login keys on that
  binding, never silently on email: an unbound local account adopts the SSO
  identity on first login, but a *different* SSO identity presenting an
  already-bound email is **refused with `403`** — it can never take over another
  user's account.

---

## Real-Time Control Channel

REST mutations are not silent: every successful create/update/delete on a user-scoped
resource broadcasts a `state:changed` event over Socket.IO to that user's room, so any
connected UI updates live without polling. UI-only verbs (focus a widget, switch the
active tab) that have no DB equivalent are driven via `POST /api/ui/command`.

### Joining the user room (Socket.IO)

```js
const socket = io('http://localhost:3002', { transports: ['websocket'] });
socket.on('connect', () => socket.emit('authenticate', { token: API_TOKEN })); // or a session token
socket.on('authenticated', ({ userId }) => { /* now in room user:<userId> */ });
```

`authenticate` accepts the `API_TOKEN` (→ bootstrap user) or a valid session token.
On success the socket joins `user:<userId>` and receives the events below.

### `state:changed` (server → client)

Emitted after a mutation commits, to the writer's user room:

```ts
{
  domain: 'dashboard' | 'widget' | 'group' | 'settings' | 'provider',
  action: 'created' | 'updated' | 'deleted',
  id: string,        // row id (or settings key, or "widget:<id>" for per-widget settings)
  data: object,      // full row after the mutation (minimal id payload for deletes)
  origin?: string,   // X-Client-Id header of the writer, if sent — lets a client ignore its own echo
  rev: number        // monotonic per-user counter; drop stale/duplicate events
}
```

Send an `X-Client-Id: <id>` header on your own writes to receive it back as `origin`
and suppress the echo. Use `rev` to discard out-of-order or duplicate events.

### `POST /api/ui/command` (UI-only verbs)

Emits a `ui:command` to the user room, awaits the first client's `ui:command:result`
ack, and returns it. `503` if no client is connected; `504` on timeout (default 5s,
override with `timeoutMs`).

```bash
curl -X POST http://localhost:3001/api/ui/command \
  -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"set_active_dashboard","payload":{"dashboardId":"<uuid>"}}'
```

| Command | Payload | Effect |
|---------|---------|--------|
| `set_active_dashboard` | `{ dashboardId }` | Switch the active dashboard tab |
| `bring_widget_to_front` | `{ dashboardId, widgetId }` | Raise a widget's z-order |
| `set_widget_settings` | `{ widgetId, widgetType, settings }` | Apply free-form per-widget settings (client maps to its store) |
| `get_ui_state` | `{}` | Client returns `{ activeDashboardId, widgets: [{id, type}] }` |

Clients listen for `ui:command` `{ id, type, payload }` and must reply with
`ui:command:result` `{ id, ok, error?, data? }` (echo the same `id`).

---

## User State API

### Dashboards

```bash
# List all dashboards
GET /api/dashboards

# Get dashboard with all widgets
GET /api/dashboards/:id

# Create dashboard
POST /api/dashboards
Body: { "title": "My Dashboard", "description": "optional", "layout": {}, "isDefault": false }

# Update dashboard
PUT /api/dashboards/:id
Body: { "title": "New Title", "layout": { "gridSize": { "width": 1920, "height": 1080 } } }

# Delete dashboard (cascades to widgets)
DELETE /api/dashboards/:id
```

### Widgets

```bash
# List widgets for a dashboard
GET /api/widgets/dashboard/:dashboardId

# Create widget
POST /api/widgets
Body: {
  "dashboardId": "uuid",
  "type": "chart",
  "defaultTitle": "BTC Chart",
  "position": { "x": 0, "y": 0, "width": 800, "height": 500, "zIndex": 1 },
  "config": {},
  "groupId": "optional-group-uuid"
}

# Update widget (position, title, config, visibility)
PUT /api/widgets/:id
Body: { "position": { "x": 100, "y": 200, "width": 800, "height": 500, "zIndex": 1 } }

# Batch update positions (for drag-and-drop rearrangement)
PUT /api/widgets/batch
Body: { "widgets": [{ "id": "uuid1", "position": {...} }, { "id": "uuid2", "position": {...} }] }

# Delete widget
DELETE /api/widgets/:id
```

Widget types: `chart`, `orderbook`, `trades`, `orderForm`, `portfolio`, `userBalances`, `userTradingData`, `deals`, `transactionHistory`, `dataProviderSettings`, `dataProviderDebug`, `exchanges`, `markets`, `pairs`.

### Groups (Instrument Linking)

```bash
# List all groups
GET /api/groups

# Create group
POST /api/groups
Body: {
  "name": "BTC Spot",
  "color": "#2196F3",
  "exchange": "binance",
  "market": "spot",
  "tradingPair": "BTC/USDT"
}

# Update group
PUT /api/groups/:id
Body: { "tradingPair": "ETH/USDT", "exchange": "bybit" }

# Delete group
DELETE /api/groups/:id
```

Colors: `transparent`, `#00BCD4`, `#F44336`, `#9C27B0`, `#2196F3`, `#4CAF50`, `#FF9800`, `#E91E63`.

### Exchange Accounts (Central Accounts)

`/api/accounts/*` is a thin **proxy** in front of the auth service's
`/api/v1/me/exchanges*` endpoints — exchange keys live **server-side** in the
`auth.marketmaker.cc` vault, never in this server's DB and never in the browser.
The proxy forwards the **caller's own SSO JWT**, so these routes require a genuine
**SSO identity** (an `API_TOKEN` or local-session bearer is rejected with `401`).
The terminal stays a single API origin (the browser never calls auth cross-origin).

```bash
# List own + shared accounts (metadata only — no key material is ever returned)
GET /api/accounts
# -> [{ id, exchange, label, read_only, has_ro_keys, owner_user_id,
#       access_level, shared, created_at }]

# Add an account (keys go straight to the auth vault; nothing sensitive is stored here)
POST /api/accounts
Body: {
  "exchange": "binance",
  "label": "My Binance",
  "api_key": "your-api-key",
  "api_secret": "your-secret",
  "passphrase": "optional",
  "read_only": false,
  "api_key_ro": "optional read-only key",
  "api_secret_ro": "optional read-only secret",
  "passphrase_ro": "optional"
}
# -> 201 { id, exchange, label, read_only }

# Edit metadata or rotate credentials without changing the account id.
# Omitted secret fields keep their current values; api_key + api_secret must be
# supplied together. The exchange itself is immutable.
PATCH /api/accounts/:id
Body: {
  "label": "Primary Binance",
  "read_only": false,
  "api_key": "optional replacement key",
  "api_secret": "optional replacement secret",
  "passphrase": "optional replacement passphrase"
}
# -> 200 { id, exchange, label, read_only, has_ro_keys }

# Delete an account by id
DELETE /api/accounts/:id
# -> { ok: true }
```

The `id` returned here is the **credential id** used as `accountId` on the
`/api/exchange/*` trading endpoints (see [Market Data API](#market-data-api)).

#### Sharing (grants)

An owner can grant another ecosystem user `read` or `trade` access:

```bash
# List grants on an account you own
GET /api/accounts/:id/grants
# -> [{ id, grantee_user_id, grantee_email, access_level, created_at }]

# Share at read|trade level (by email or user id)
POST /api/accounts/:id/grants
Body: { "grantee_email": "trader@example.com", "access_level": "read" }
# -> 201

# Revoke a grant
DELETE /api/accounts/:id/grants/:grantId
# -> { ok: true }
```

### User Settings (Key-Value)

```bash
# Get all settings
GET /api/settings

# Get specific setting
GET /api/settings/:key

# Set a setting (upsert)
PUT /api/settings/:key
Body: { "value": "dark" }

# Bulk set settings
PUT /api/settings
Body: { "settings": { "theme": "dark", "activeDashboardId": "uuid", "selectedGroupId": "uuid" } }

# Delete a setting
DELETE /api/settings/:key
```

Common keys: `activeDashboardId`, `selectedGroupId`, `activeProviderId`, `theme`, `dataFetchSettings`.

### Widget Settings (Per-Widget, Per-User)

```bash
# Get widget settings
GET /api/settings/widget/:widgetId

# Set widget settings (upsert)
PUT /api/settings/widget/:widgetId
Body: { "settings": { "timeframe": "1h", "showVolume": true } }
```

### Data Providers

```bash
# List providers
GET /api/providers

# Create provider
POST /api/providers
Body: {
  "name": "My Server Provider",
  "type": "ccxt-server",
  "exchanges": ["binance", "bybit"],
  "priority": 50,
  "config": { "serverUrl": "http://localhost:3001", "token": "my-token" }
}

# Update provider
PUT /api/providers/:id
Body: { "status": "disconnected", "priority": 100 }

# Delete provider
DELETE /api/providers/:id

# List server-side providers registered in the provider registry (read-only):
# the built-in 'ccxt' plus any module-supplied providers.
GET /api/providers/available
# -> { success, data: [{ id, displayName, exchanges, priority, fromModule? }] }
```

Per-user provider types: `ccxt-server`, `marketmaker.cc`, `custom-server-with-adapter`
(the `ccxt-browser` type was removed in Stage 2 — all data goes through the server).

---

## Market Data API

### REST Endpoints

Public market-data endpoints take a `config` object specifying the exchange:

```json
{ "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" }
```

These dispatch through the **server provider registry**. Every response includes
a `provider` field naming the provider that served it (e.g. `"ccxt"`). Pass an
optional top-level `providerId` to force a specific provider; omitted, the
registry picks the lowest-`priority` provider supporting the exchange.

#### Authenticated endpoints — central-accounts flow

The private endpoints (`fetchBalance`, `createOrder`, `cancelOrder`,
`fetchMyTrades`, `fetchOrders`, `fetchOpenOrders`, `fetchPositions`,
`fetchLedger`) resolve exchange keys **server-side** from the auth vault. The
preferred body shape carries **no secrets**:

```json
{
  "accountId": "<credential-id from GET /api/accounts>",
  "want": "read",
  "exchange": "binance",
  "market": "spot"
}
```

- `accountId` is the credential id from `GET /api/accounts`. When present, the
  server fetches decrypted keys for the caller's SSO identity at the required
  access level (`want`) — any secrets sent inline are **ignored**. Requires a real
  SSO bearer (`401` otherwise).
- Routing fields (`exchange`/`market`/`sandbox`) may be sent flat **top-level** or
  wrapped in a secret-free `config` (`config.exchangeId`/`marketType`/`sandbox`);
  inner-`config` fields win per-field when both are present.
- **`createOrder`/`cancelOrder` force `want: 'trade'`** regardless of the body — a
  read-only credential/grant is refused with `403`. Reads honor an explicit
  `want` but never need more than `read`.
- **Legacy inline path** (still supported transitionally): omit `accountId` and
  pass `config.apiKey`/`secret`/`password` inline. Without keys the call returns
  `400` (`"API credentials required"`).

| Endpoint | Body | Description |
|----------|------|-------------|
| `GET /api/exchange/list` | — | All exchange ids CCXT knows |
| `POST /api/exchange/instance` | `{ config }` (bare config as body) | Create/get cached provider instance |
| `POST /api/exchange/fetchTicker` | `{ config, symbol, providerId? }` | Fetch ticker |
| `POST /api/exchange/fetchOrderBook` | `{ config, symbol, limit?, providerId? }` | Fetch order book |
| `POST /api/exchange/fetchTrades` | `{ config, symbol, limit?, providerId? }` | Fetch trades |
| `POST /api/exchange/fetchOHLCV` | `{ config, symbol, timeframe?, limit?, providerId? }` | Fetch candles |
| `POST /api/exchange/capabilities` | `{ config, providerId? }` | Get exchange features |
| `POST /api/exchange/market` | `{ config, symbol, providerId? }` | One market's metadata (limits/precision) |
| `POST /api/exchange/fetchBalance` | `{ accountId, want?, exchange, market?, providerId? }` | Fetch balance (auth) |
| `POST /api/exchange/createOrder` | `{ accountId, exchange, market?, symbol, type, side, amount, price?, params?, providerId? }` | Place order (forces `want: 'trade'`) |
| `POST /api/exchange/cancelOrder` | `{ accountId, exchange, market?, orderId, symbol, providerId? }` | Cancel order (forces `want: 'trade'`) |
| `POST /api/exchange/fetchMyTrades` | `{ accountId, want?, exchange, market?, symbol?, since?, limit?, providerId? }` | Authenticated trade history |
| `POST /api/exchange/fetchOrders` | `{ accountId, want?, exchange, market?, symbol?, since?, limit?, providerId? }` | All orders (open + closed) |
| `POST /api/exchange/fetchOpenOrders` | `{ accountId, want?, exchange, market?, symbol?, providerId? }` | Open orders |
| `POST /api/exchange/fetchPositions` | `{ accountId, want?, exchange, market?, symbols?, providerId? }` | Open positions |
| `POST /api/exchange/fetchLedger` | `{ accountId, want?, exchange, market?, code?, since?, limit?, providerId? }` | Ledger entries (deposits/withdrawals/transfers/fees) |
| `POST /api/exchange/leverageMarkets` | `{ accountId, want?, exchange, market?, marketType?, providerId? }` | Derivative pairs + the leverage cap the exchange publishes |
| `POST /api/exchange/fetchLeverages` | `{ accountId, want?, exchange, market?, symbols?, refresh?, providerId? }` | Leverage currently set on the account (max 50 symbols per call; served from a 5-minute per-account cache unless `refresh`) |
| `POST /api/exchange/setLeverages` | `{ accountId, exchange, market?, symbols, leverage \| 'max', dryRun?, providerId? }` | Bulk-set leverage (forces `want: 'trade'`; max 20 symbols per call) |
| `POST /api/proxy/request` | `{ url, method?, headers?, body?, timeout? }` | CORS proxy |

### WebSocket (Socket.IO)

Connect to `http://localhost:3002` for real-time streaming.

```javascript
const socket = io('http://localhost:3002');
socket.emit('authenticate', { token: 'your-token' });
socket.on('authenticated', () => {
  socket.emit('subscribe', {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    dataType: 'trades',  // ticker | trades | orderbook | ohlcv | balance
    config: { exchangeId: 'binance', marketType: 'spot', ccxtType: 'pro' },
    providerId: 'ccxt'   // optional; omit to resolve by priority
  });
});
socket.on('data', (msg) => console.log(msg.dataType, msg.data));
socket.emit('unsubscribe', { subscriptionId: '...' });
```

---

## Database Schema

9 tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, bcrypt password hash) |
| `sessions` | Auth sessions (token, expiry, FK to user) |
| `dashboards` | User dashboards (title, layout config) |
| `widgets` | Widgets within dashboards (type, position, config) |
| `groups` | Instrument linking groups (color, pair, exchange) |
| `exchange_accounts` | Legacy local credential table (encrypted). Still in the schema, but `/api/accounts` now proxies to the auth vault — see [Exchange Accounts](#exchange-accounts-central-accounts) |
| `data_providers` | CCXT provider configurations |
| `user_settings` | Key-value settings per user |
| `widget_settings` | Per-widget per-user settings |

```bash
# Database management (run from packages/server/)
bun db:push      # Create/update tables from schema
bun db:generate  # Generate SQL migration files
bun db:migrate   # Apply migrations
bun db:studio    # Open Drizzle Studio GUI
```

---

## Error Handling

```json
{ "error": "Human-readable message", "details": "Technical details" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request (missing params, unsupported feature) |
| `401` | Missing or expired auth token |
| `403` | Invalid token / not your resource |
| `404` | Resource not found |
| `408` | Request timeout (proxy) |
| `409` | Conflict (e.g. email already registered) |
| `500` | Server error |
| `503` | No UI client connected (ui:command) |
| `504` | ui:command timed out waiting for a client ack |

---

## LLM Integration Guide

Complete workflow for an AI agent:

```
1. POST /api/auth/register              -- create user account (or use an SSO JWT / API_TOKEN)
2. GET  /health                          -- verify server running
3. GET  /api/dashboards                  -- list user's dashboards
4. POST /api/widgets                     -- add a chart widget
5. PUT  /api/widgets/batch               -- arrange widget positions
6. POST /api/groups                      -- create instrument group (BTC/USDT on Binance)
7. PUT  /api/widgets/:id                 -- link widget to group
8. POST /api/accounts                    -- register exchange keys in the auth vault (SSO only)
9. GET  /api/accounts                    -- get the credential id (accountId)
10. POST /api/exchange/capabilities      -- discover exchange features
11. POST /api/exchange/fetchTicker       -- get current price
12. POST /api/exchange/createOrder       -- place an order { accountId, exchange, symbol, ... }
13. Socket.IO subscribe to trades        -- monitor real-time data
```
