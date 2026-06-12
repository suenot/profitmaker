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

## Authentication

Two auth methods are supported:

1. **Session token** (for users) -- obtained via `/api/auth/login` or `/api/auth/register`
2. **API token** (for server-to-server) -- set via `API_TOKEN` env var

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

### Exchange Accounts

```bash
# List accounts (API keys are NOT returned)
GET /api/accounts

# Add exchange account
POST /api/accounts
Body: {
  "exchange": "binance",
  "apiKey": "your-api-key",
  "secret": "your-secret",
  "password": "optional-passphrase",
  "label": "My Binance",
  "isEncrypted": true
}

# Update account
PUT /api/accounts/:id
Body: { "label": "Binance Main", "apiKey": "new-key" }

# Delete account
DELETE /api/accounts/:id
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
```

Provider types: `ccxt-browser`, `ccxt-server`, `marketmaker.cc`, `custom-server-with-adapter`.

---

## Market Data API

### REST Endpoints

All require a `config` object specifying the exchange:

```json
{ "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" }
```

| Endpoint | Body | Description |
|----------|------|-------------|
| `POST /api/exchange/instance` | `{ config }` | Create/get cached CCXT instance |
| `POST /api/exchange/fetchTicker` | `{ config, symbol }` | Fetch ticker |
| `POST /api/exchange/fetchOrderBook` | `{ config, symbol, limit? }` | Fetch order book |
| `POST /api/exchange/fetchTrades` | `{ config, symbol, limit? }` | Fetch trades |
| `POST /api/exchange/fetchOHLCV` | `{ config, symbol, timeframe?, limit? }` | Fetch candles |
| `POST /api/exchange/fetchBalance` | `{ config }` | Fetch balance (requires API keys) |
| `POST /api/exchange/capabilities` | `{ config }` | Get exchange features |
| `POST /api/exchange/watch*` | `{ config, symbol }` | CCXT Pro WebSocket (requires `ccxtType: "pro"`) |
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
    config: { exchangeId: 'binance', marketType: 'spot', ccxtType: 'pro' }
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
| `exchange_accounts` | Exchange API credentials (encrypted) |
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
1. POST /api/auth/register              -- create user account
2. GET  /health                          -- verify server running
3. GET  /api/dashboards                  -- list user's dashboards
4. POST /api/widgets                     -- add a chart widget
5. PUT  /api/widgets/batch               -- arrange widget positions
6. POST /api/groups                      -- create instrument group (BTC/USDT on Binance)
7. PUT  /api/widgets/:id                 -- link widget to group
8. POST /api/accounts                    -- add exchange API keys
9. POST /api/exchange/capabilities       -- discover exchange features
10. POST /api/exchange/fetchTicker       -- get current price
11. Socket.IO subscribe to trades        -- monitor real-time data
```
