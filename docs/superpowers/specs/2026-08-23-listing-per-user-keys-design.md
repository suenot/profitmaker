# Listing Widgets — Per-User Keys (Round 2) — Design

Date: 2026-08-23
Status: Approved (user picked hybrid model + mint-on-demand internal endpoint)

## Context

Round 1 (shipped as `profitmaker-module-listing@0.1.0`) runs everything on one
server-side `LISTINGAPIS_API_KEY`. The user wants terminal users to pay for
their own Live SSE usage with their own MarketMaker keys: auth is already
centralized at auth.marketmaker.cc, and ListingAPIs bills per-key fingerprint
to the key owner's MM balance.

Facts that shape the design (verified in code):

- **Terminal SSO** (`packages/server/src/services/ssoAuth.ts`): RS256 JWTs from
  auth.marketmaker.cc; the auth gate in `index.ts:onBeforeHandle` resolves the
  caller but discards the identity. Module dispatch
  (`modules/manager.ts:rewriteForModule`) strips `authorization`/`cookie` —
  third-party module code must never see session credentials. Modules today
  receive NO caller identity at all.
- **Auth service** (`~/projects/server/auth-service`, Go/Gin): `api_keys`
  stores only `key_hash` — a raw `mk_live_*` key is shown once at creation and
  is never retrievable by anyone. Internal plane = `X-Internal-Secret`
  (`cfg.InternalSecret`), pattern of `internalFetchExchangeCredentialHandler`.
  Per-service roles live in `service_roles (user_id, service, role)`.
- **Module SDK**: routes are root-relative Elysia under `/api/modules/<id>`;
  `ctx.io` namespace `/m/<id>` has no per-socket identity.

## Model (approved)

Hybrid billing:

- **Shared data** (trends, stats, exchanges): server-side
  `LISTINGAPIS_API_KEY`, 5-min poller, cached — operator pays ~3 calls/5 min.
- **Live listings**: per-user. Each user with a listingapis role gets their own
  upstream SSE connection authenticated with a freshly minted, service-scoped
  `mk_live_*` key — billed to that user's MM balance. Users without the
  service role see a "subscription required" state, not the operator's feed.

## Decisions

### D1. Auth-service: mint-on-demand internal endpoint

New `POST /api/v1/internal/service-keys/issue` (same plane and guard pattern
as `/internal/exchange-credentials`):

```json
// request
{ "requester_user_id": "<uuid>", "service": "listingapis",
  "label": "profitmaker-terminal", "ttl_hours": 168 }
// response 200
{ "key": "mk_live_...", "key_id": "<uuid>", "prefix": "mk_live_xxxxxxxx",
  "expires_at": "2026-08-30T00:00:00Z" }
```

- `X-Internal-Secret` required (503 if unconfigured, 401 on mismatch — same as
  exchange-credentials).
- Service must exist in the `services` table (400 otherwise).
- Requester must have ANY role row in `service_roles` for that service (403
  `no subscription` otherwise).
- `label` defaults to `issued:terminal`; minting revokes the user's prior
  ACTIVE keys with the same (service, label) first — one live terminal key per
  user, no key spam. `ttl_hours` defaults to 168 (7 days), clamped to
  [1, 720].
- Hard cap: max 10 active issued keys per (user, service) → 429.
- Key row: `scopes = [service]`, standard `generateAPIKeyRaw()`/`hashAPIKey()`
  path. Revocation visibility: keys appear in the user's existing `/api/v1/keys`
  UI and can be revoked there.

### D2. Terminal core: host-minted identity header for modules

- The auth gate resolves local-session and SSO callers already; it now records
  `{ userId, authUserId }` in a module-scoped `WeakMap<Request, Identity>`.
- `rewriteForModule` (which already rebuilds the Request with sanitized
  headers): deletes any client-supplied `x-pm-user-id`/`x-pm-user-auth-id`
  (forgery guard), then sets `x-pm-user-id: <local user id>` and
  `x-pm-user-auth-id: <authUserId>` from the WeakMap when present.
  `API_TOKEN` server-to-server calls carry no identity (absent headers).
- SDK `types.ts` documents the headers in the module contract. Modules get
  identity, never credentials — the trust boundary is unchanged.
- Live SSE delivery uses plain HTTP module routes (no socket identity work).

### D3. Module: per-user Live pipeline

- `keyResolver`: mints via `AUTH_INTERNAL_URL` (default
  `https://auth.marketmaker.cc`) + `AUTH_INTERNAL_SECRET` env; caches
  `userId → {key, expiresAt}` in memory only; re-mints on <12h remaining or
  after an upstream 401.
- `userStreams`: map `userId → { sse (existing `createSseService` instantiated
  with the user's key), ring(50), subscribers, idleTimer }`. Lazy start on
  first `/stream` subscriber; teardown 60s after the last subscriber leaves;
  hard cap 50 concurrent users (new subscribers beyond the cap get a 503
  status event and retry-after semantics).
- Routes:
  - `GET /stream` — per-user downstream (text/event-stream via fetch
    ReadableStream): `hello`, `listing`, `status` events + `: heartbeat`
    comments every 25s; aborts upstream reader on client disconnect
    (`request.signal`).
  - `GET /listings/recent` — reads the CALLING user's ring (requires
    `x-pm-user-id`; 401 otherwise).
  - `GET /trends|/stats|/exchanges|/status` — unchanged (server key, poller).
- The round-1 global SSE service and its socket pushes are REMOVED from boot
  (server key now feeds only the poller). `/m/listing` socket namespace use in
  the Live widget is replaced by the `/stream` fetch-stream client.
- Widget: stream client parses SSE frames from `terminal.api.fetch` body,
  drives the same alert pipeline (toast/sound/auto-restore) and status badge.
  Banner states: no identity (401) → "sign in", mint 403 → "listingapis
  subscription required", upstream 402 → "MM balance exhausted", cap →
  "busy, retrying", upstream errors → reconnect backoff.
- Version `0.2.0`. README updated (env vars: `AUTH_INTERNAL_SECRET` required
  for Live, `LISTINGAPIS_API_KEY` now only for shared widgets).

## Non-goals

- Per-user trends/stats (stays operator-paid, cached).
- Socket.IO per-socket identity (HTTP identity header suffices).
- Retroactive retrieval of existing user keys (impossible by design).

## Error handling

| Failure | Behavior |
|---|---|
| `AUTH_INTERNAL_SECRET` unset on terminal | `/stream` 503 "terminal auth bridge not configured" |
| Auth service down | `/stream` 503, widget retries with backoff |
| User lacks listingapis role | mint 403 → widget "subscription required" banner |
| Mint 429 (key cap) | `/stream` 503 retry-after 60s |
| Upstream 401 (key revoked/expired) | re-mint once, then "sign in"-style error |
| Upstream 402 | per-user status event; amber banner; SSE retry at 5-min cadence |
| User stream cap reached | 503 "busy" status event; widget retries 60s |
| Client disconnect | subscriber removed; upstream torn down after idle window |

## Testing

- Auth-service: Go handler tests (secret gate, role gate, revoke-then-mint,
  TTL clamp, cap 429) following `exchange_credentials_test.go` patterns.
- Terminal core: gate stores identity; rewrite injects + strips forged
  headers; API_TOKEN path has no identity.
- Module: keyResolver (cache, re-mint triggers), userStreams lifecycle
  (lazy start, idle teardown, cap), `/stream` framing + abort, per-user ring
  isolation; widget stream-parser unit tests.
- Full workspace verification + module build; publish `0.2.0` on approval.
