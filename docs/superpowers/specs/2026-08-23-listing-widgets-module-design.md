# Listing Widgets Module — Design

Date: 2026-08-23
Status: Approved (user signed off on approach A with polling fallback)

## Context

The terminal (`profitmaker-react`) has a module system: out-of-tree npm packages
(manifest in `package.json` under `profitmaker`, validated by
`packages/sdk/src/manifest.ts`) providing frontend widgets plus a backend
service mounted under `/api/modules/<id>` with a Socket.IO namespace `/m/<id>`.
Template: `templates/module-template`.

ListingAPIs (user's own product, backend at `https://api.listingapis.com`)
exposes:
- REST `GET /api/public/listings|listings/:id|tickers|trends|stats|exchanges`
- SSE `GET /api/public/stream` (`hello`, `listing` events, `: heartbeat` comments every ~25 s; filters `?exchange=`, `?type=`)
- Auth: `Authorization: Bearer <MM API key>`, pay-per-call billed in MM tokens; `402` when balance is exhausted.

## Goals

Three widgets in one module, fed by the module's own backend proxy:
1. **`listing.live` — Live Listings**: realtime feed of new listing events.
2. **`listing.trends` — Trends**: 7d/30d trending tickers and exchanges.
3. **`listing.stats` — Stats / Activity**: global stats + 24h/7d/30d activity.

Alerting on new listing events runs in **max mode**: feed entry + terminal
toast (`terminal.notify`) + sound (Web Audio beep) + auto-restore of the
Live widget if minimized (via dashboard store `toggleWidgetMinimized`).

## Non-goals

- Investor metrics widget (explicitly out of scope this round).
- Order placement / trading actions on listing events.
- Client-side direct connections to api.listingapis.com (key never leaves the
  module backend).

## Decisions

- **Delivery**: npm module (no core edits). Package `profitmaker-module-listing`,
  module id `listing`. Source lives in `modules/listing/` inside this repo;
  root `package.json` workspaces extended with `modules/*` (mirrors how
  `templates/*` workspaces work). Dev via `PROFITMAKER_DEV_MODULES`.
- **Auth**: Bearer MM API key, read from `LISTINGAPIS_API_KEY` env on the
  terminal server. Base URL override: `LISTINGAPIS_API_URL`
  (default `https://api.listingapis.com`).
- **Streaming**: one server-side SSE connection shared by all clients; events
  rebroadcast on `/m/listing` namespace. If SSE drops, exponential-backoff
  reconnect; after 2 consecutive failures fall back to REST polling
  `/api/public/listings?limit=10` every 30 s until SSE reconnects. Clients
  never see the difference (same `listing` push event).
- **Billing hygiene**: SSE is billed per connection — exactly one connection
  per terminal server. Trends/Stats polled every 5 min via `ctx.jobs.every`
  regardless of connected clients (results cached server-side; widgets read
  cache, so idle dashboards cost nothing extra).

## Architecture

### Backend (`src/backend/index.ts` + helpers)

```
start(ctx)
├── apiClient      — fetch wrapper: base URL, Bearer key, 10s timeout,
│                    402 → typed BillingError, 401 → typed AuthError
├── sseService     — EventSource-style SSE over fetch-stream to
│                    /api/public/stream; parses `listing` events and
│                    heartbeats; reconnect w/ backoff; REST-poll fallback;
│                    emits ctx.io.emit('listing', event) and appends to
│                    in-memory ring buffer (last 100 events)
├── pollerJob      — ctx.jobs.every(5 min): GET /trends, /stats → cache
│                    (ctx.storage mirror for restart survival)
└── routes (Elysia, root-relative)
    ├── GET /listings/recent?limit=  — ring buffer (default 50, max 100)
    ├── GET /trends                  — cached Trends
    ├── GET /stats                   — cached StatsResponse
    └── GET /status                  — { sse: 'up'|'reconnecting'|'polling',
                                        lastEventAt, lastError, billing? }
```

Push events on `/m/listing`:
- `listing` — `{ id, exchange, symbol, type, title, url, listedAt, detectedAt, source }`
- `status` — SSE state transitions (so widgets can show a connection badge)

Missing `LISTINGAPIS_API_KEY`: module starts, routes return
`503 { error: 'LISTINGAPIS_API_KEY is not configured' }`, widgets show a
setup hint. `402` from upstream: routes return `402 { error: 'MM balance exhausted' }`;
Live widget shows persistent amber banner "MM balance exhausted — top up at
auth.marketmaker.cc"; no toast spam (banner only, re-checked on next event).

### Frontend (`src/frontend/index.tsx` + widget files)

`defineModule({ id: 'listing', widgets: [LiveListings, Trends, StatsWidget] })`.

All widgets styled with the host `terminal-*` CSS variables (same palette as
built-ins), theme-aware via `prefers-color-scheme`/host classes — the module
ships its own `style.css` but uses the host's CSS custom properties.

1. **`listing.live`** (Live Listings, icon `Zap`, default 420x420)
   - Header: connection badge (live/reconnecting/polling) from `status` events.
   - Body: virtualized list (hand-rolled windowing, no new deps) — time
     (HH:MM:SS), exchange, symbol + full name, type chip (Listing/New Pair),
     link to source url. Newest on top.
   - Backfill: `GET /listings/recent` on mount, then `listing` pushes.
   - Filters (Settings panel): exchanges (multi-select from /exchanges data
     via backend cache), types (listing/new-pair), sound on/off, toast on/off,
     auto-restore on/off (all default on; persisted to widget `config`).
   - Alert pipeline on `listing` event passing filters: prepend to feed,
     `terminal.notify.info(...)`, Web Audio beep (created lazily after first
     user interaction — autoplay policy), if widget minimized → find its
     dashboard and `toggleWidgetMinimized(dashboardId, widgetId)`.
   - Dedup by event `id` (reconnects replay).

2. **`listing.trends`** (Trends, icon `TrendingUp`, default 380x420)
   - Tabs: 7 days / 30 days; sub-tabs or split: Tickers / Exchanges.
   - Ticker row: rank, symbol, full name, listings count, exchanges count,
     change % colored (up=positive green, down=negative red, stable=muted).
   - Exchange row: rank, name, listings, unique tickers.
   - Data: `GET /trends` on mount + refresh every 5 min (aligns with poller);
     `last_updated` footer.

3. **`listing.stats`** (Stats, icon `BarChart3`, default 360x300)
   - Stat tiles: total listings, exchanges, tickers, pairs.
   - Activity strip: new listings 24h / 7d / 30d, top exchange per window.
   - Quote currencies: top pairs by count.
   - Data: `GET /stats` on mount + 5 min refresh.

Widget config keys (Live): `exchanges?: string[]`, `types?: string[]`,
`sound?: boolean`, `toast?: boolean`, `autoRestore?: boolean`.

## Error handling

| Failure | Behavior |
|---|---|
| API key missing | 503 from routes; widgets show setup hint; no retries storm |
| 401 invalid key | same as 503 but message "invalid LISTINGAPIS_API_KEY" |
| 402 balance exhausted | amber banner in Live widget; SSE keeps retrying at slow cadence (5 min) |
| SSE drop | backoff reconnect (1s→2s→…→60s cap); after 2 fails switch to 30s REST polling; status badge updates |
| Upstream 5xx/timeouts | routes return 502; widgets keep last good data + stale timestamp |
| Module backend restart | ring buffer rebuilt from `/api/public/listings?limit=100` backfill |

## Testing

- Backend unit tests (vitest, colocated): apiClient error mapping, SSE parser
  (event/heartbeat/reconnect state machine with injected fake timer + fake
  fetch), ring buffer dedup, poller caching, route handlers (status codes,
  503/402 paths with env unset / stubbed upstream).
- Frontend: pure helpers tested (filter matching, dedup, time formatting);
  component render tests where the SDK shims allow (follow template test
  conventions; skip if shims make it impractical — document that).
- `bun run typecheck` green for the new workspace; `bun run build` produces
  `dist/frontend/index.js`, `dist/frontend/style.css`, `dist/backend/index.js`.

## Packaging

- `package.json`: `profitmaker-module-listing`, `keywords: ["profitmaker-module"]`,
  `files: ["dist", "package.json", "README.md"]`, manifest with
  `permissions: ["network", "storage", "jobs"]`, widgets meta for Module Store.
- Publish with `npm publish` (unscoped, public; user token already valid).
- README: install via Module Store or `POST /api/modules/install`, env vars,
  dev-mode instructions.
