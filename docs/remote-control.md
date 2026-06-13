# Remote Control — Driving the Terminal from the Backend

The Profitmaker terminal is **fully drivable from the backend**. Every REST
mutation to a user's dashboards, widgets, groups, settings, or providers is
broadcast to that user's connected browsers in real time, and UI-only verbs
(switch the active tab, focus a widget, read the live UI state) are executable
over a request/ack channel. An AI agent, a script, or `curl` can build and
operate a live trading workspace with no human in the loop.

This is the control surface. It is the companion to the data/CRUD reference in
[server-api.md](server-api.md); read that for the full endpoint list.

## How it works

```
  agent / script / curl                server (:3001 REST, :3002 Socket.IO)            browser(s)
  ─────────────────────                ───────────────────────────────────            ──────────
  PUT /api/widgets/:id  ───────────▶   mutate DB ─▶ emit state:changed  ───────────▶  SyncBridge applies
                                                     to room user:<id>                  → widget moves live

  POST /api/ui/command  ───────────▶   emit ui:command to room  ─────────────────────▶ SyncBridge executes
        { set_active_dashboard }        ◀──── ui:command:result ack ──────────────────  → tab switches
  ◀──── 200 { ok }
```

Two layers:

1. **State (server-authoritative).** Dashboards and groups live in PostgreSQL.
   Each browser runs a **SyncBridge** (`packages/client/src/services/syncBridge.ts`)
   that hydrates from REST on connect (server wins), then applies `state:changed`
   events into its local stores. Client-originated edits write through to REST,
   so all clients and the DB stay converged.
2. **UI commands (client-executed).** Some verbs have no DB representation —
   which tab is active, which widget is on top, a chart's timeframe. These are
   sent as `ui:command`s; a connected browser executes them and acks the result.

## Authentication

Use the `API_TOKEN` as a Bearer token. It transparently resolves to a single
**bootstrap user** (`default@local`, created on first use), so a token-only
caller can use every user-scoped route with no login. (Real session tokens work
too and are scoped to their own user.)

```bash
export PROFITMAKER_URL=http://localhost:3001
export PROFITMAKER_TOKEN=test-token        # = the server's API_TOKEN

curl -s "$PROFITMAKER_URL/api/dashboards" -H "Authorization: Bearer $PROFITMAKER_TOKEN"
```

Send an optional `X-Client-Id: <id>` header on your writes. It comes back as the
`origin` field on the resulting `state:changed` event, letting a client ignore
the echo of its own change.

## Endpoints used for control

CRUD mutations (each emits a `state:changed` event — see below):

| Verb | Endpoint | Effect |
|------|----------|--------|
| Create dashboard | `POST /api/dashboards` | New tab appears in every open UI |
| Update dashboard | `PUT /api/dashboards/:id` | Title/layout change reflected live |
| Delete dashboard | `DELETE /api/dashboards/:id` | Tab removed live |
| Create widget | `POST /api/widgets` | Widget appears on its dashboard |
| Update widget | `PUT /api/widgets/:id` | Position/visibility/title/group/config change live |
| Batch update | `PUT /api/widgets/batch` | Many positions at once (drag/resize) |
| Delete widget | `DELETE /api/widgets/:id` | Widget removed live |
| Create/Update/Delete group | `POST/PUT/DELETE /api/groups[/:id]` | Group context (exchange/pair/market) — widgets bound to the group retarget live |

UI-only verbs:

| Verb | Endpoint |
|------|----------|
| Execute a UI command | `POST /api/ui/command` |

## `state:changed` events

Connect a Socket.IO client to `:3002`, authenticate, and you join the room
`user:<userId>`. After every committed mutation the server emits:

```ts
socket.on('state:changed', (evt) => {
  // {
  //   domain: 'dashboard' | 'widget' | 'group' | 'settings' | 'provider',
  //   action: 'created' | 'updated' | 'deleted',
  //   id: string,        // row id (settings key, or "widget:<id>" for per-widget settings)
  //   data: object,      // full row after the mutation
  //   origin?: string,   // X-Client-Id of the writer, if sent
  //   rev: number,       // monotonic per-user counter — drop stale/duplicate events
  // }
});
```

```js
const { io } = require('socket.io-client');
const socket = io('http://localhost:3002', { transports: ['websocket'] });
socket.on('connect', () => socket.emit('authenticate', { token: process.env.PROFITMAKER_TOKEN }));
socket.on('authenticated', ({ userId }) => console.log('in room user:' + userId));
socket.on('state:changed', (e) => console.log(e.rev, e.domain, e.action, e.id));
```

Semantics: events are emitted **after** the DB commit and carry the **full row**
in `data`. `rev` increases by one per user per mutation; use it to discard
out-of-order or duplicate events. `origin` lets the writer suppress its own echo.

## `ui:command` vocabulary

`POST /api/ui/command` emits the command to the user's room, waits for the first
connected browser to ack, and returns the result. **A browser must be open** on
the same server/user — otherwise you get `503` (no client) or `504` (timeout,
default 5s; override with `timeoutMs`).

```bash
curl -s -X POST "$PROFITMAKER_URL/api/ui/command" \
  -H "Authorization: Bearer $PROFITMAKER_TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"set_active_dashboard","payload":{"dashboardId":"<uuid>"}}'
# → { "success": true, "id": "...", "data": ... }
```

| Command | Payload | Effect / returns |
|---------|---------|------------------|
| `set_active_dashboard` | `{ dashboardId }` | Switch the active dashboard tab |
| `bring_widget_to_front` | `{ dashboardId, widgetId }` | Raise a widget's z-order |
| `set_widget_settings` | `{ widgetId, widgetType, settings }` | Apply per-widget settings (free-form; the client maps it to the right store — see gaps below) |
| `get_ui_state` | `{}` | Returns `{ activeDashboardId, widgets: [{ id, type }] }` of the live UI — useful for an agent to read what the user currently sees |

## The demo script

`scripts/control-demo.ts` drives the whole surface end to end and asserts every
response plus the live `state:changed` stream. Open the terminal in a browser
pointed at the same server and watch each step happen.

```bash
# Boot the server (from packages/server):
DATABASE_URL=postgres://USER@localhost:5432/profitmaker API_TOKEN=test-token bun src/index.ts

# In another shell, run the demo:
PROFITMAKER_URL=http://localhost:3001 PROFITMAKER_TOKEN=test-token bun scripts/control-demo.ts
#   --keep   leave the created "Agent Demo" dashboard/group in place
```

It creates a dashboard, adds chart/orderbook/trades/orderForm widgets, creates a
BTC/USDT group and binds the widgets to it, switches the active tab, moves and
resizes widgets, retargets the group to ETH/USDT (every bound widget follows —
chart, order book, and trades all resubscribe to the new symbol), verifies the
widgets stay bound to the retargeted group, sets the chart timeframe, hides a
widget, renames a widget, asserts `get_ui_state`, and removes a widget —
28 assertions across 14 steps.

### Group retarget → live resubscription

Changing a group's `tradingPair`/`exchange`/`market` (locally via the picker or
remotely via `PUT /api/groups/:id`) retargets **every widget bound to that
group**: each drops its old market-data subscription and resubscribes to the new
symbol. The chart, order book, and trades widgets all derive their instrument
from the widget's bound group (falling back to the global picker, then the
transparent group), so a remote retarget moves all of them together. Verified in
the browser via `dataProviderStore` active subscriptions: after a BTC/USDT →
ETH/USDT retarget the candles + order book subscriptions flip to ETH/USDT with no
leaked BTC/USDT subscription (ref-counted cleanup).

## Known gaps — what is *not* yet code-drivable

Honest list of current limitations (v1 of the control surface):

| Capability | Drivable now? | Note |
|------------|---------------|------|
| Dashboards: create / rename / layout / delete | ✅ REST | Full live sync |
| Widgets: add / remove / move / resize / show-hide / title / group / config | ✅ REST | Full live sync (move/resize debounced ~400ms client-side) |
| Groups: create / update context / delete | ✅ REST | Bound widgets retarget live |
| Active dashboard tab | ✅ `ui:command` | `set_active_dashboard` |
| Widget z-order (bring to front) | ✅ `ui:command` | `bring_widget_to_front` |
| Read live UI state | ✅ `ui:command` | `get_ui_state` |
| Chart timeframe | ✅ `ui:command` | `set_widget_settings` → chart store |
| Order book / trades / balances / trading-data settings | ✅ `ui:command` | mapped to their per-widget stores |
| **Module-widget settings** (`<moduleId>.<widget>`) | ⚠️ partial | `set_widget_settings` falls back to merging into the widget's `config`; whether it takes effect depends on the module reading `config`. No generic per-module settings store mapping. |
| **Settings / provider domains over the socket** | ⚠️ events only | `state:changed` is emitted for `settings` and `provider`, but the client SyncBridge does not yet mirror them into a visible store (REST still works). |
| **`duplicateDashboard`** write-through | ❌ | Duplicating a dashboard in the UI is not yet written through to the server (local-only). Use create + add-widgets via REST instead. |
| **Offline write queue** | ❌ by design (v1) | While the server is unreachable the terminal works off localStorage but does **not** queue mutations to replay; on reconnect the server state wins. |
| Placing real orders via this channel | ❌ | Order execution is a separate concern (`/api/exchange/*`), not part of the dashboard control surface. |

## Verification (June 2026)

`scripts/control-demo.ts` runs green (28/28). Browser-observed (chrome-devtools):
a curl-created dashboard tab appears without reload; a curl `PUT` moves a widget
to the asserted pixel position; `set_active_dashboard` switches the tab and URL;
hiding a widget drops it from the rendered DOM (4 widgets → 3 boxes); a renamed
widget shows its new title; retargeting the group to ETH/USDT updates the bound
widgets' instrument footer to `ETHUSDT` and flips the candles + order book
subscriptions to ETH/USDT with no leaked BTC/USDT subscription (and back to
BTC/USDT on a reverse retarget, prices ~63.5k); two browser tabs converge in
under a second; with the server stopped the terminal keeps working off
localStorage and re-hydrates on reconnect.
