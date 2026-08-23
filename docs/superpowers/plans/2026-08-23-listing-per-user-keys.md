# Listing Per-User Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live Listings widget bills each terminal user's own MarketMaker key (mint-on-demand via auth-service internal endpoint); trends/stats stay operator-paid.

**Architecture:** Three layers — (1) auth-service Go endpoint minting service-scoped `mk_live_*` keys on the internal plane; (2) terminal core injecting host-minted `x-pm-user-id` identity headers into module dispatch; (3) listing module per-user key resolution + per-user upstream SSE with downstream `/stream` route, replacing the round-1 global SSE + socket push for Live.

**Tech Stack:** Go/Gin/pgx (auth-service), TypeScript/Bun/Elysia/React (terminal + module), vitest, `go test`.

**Spec:** `docs/superpowers/specs/2026-08-23-listing-per-user-keys-design.md`

## Global Constraints

- Module id stays `listing`; package `profitmaker-module-listing` bumps to `0.2.0`.
- Raw `mk_live_*` keys exist only server-side, in-memory, never logged, never in responses to the browser.
- `x-pm-user-id`/`x-pm-user-auth-id` are HOST-MINTED: core strips client-supplied values before injecting (forgery guard); modules read but never set them.
- No new runtime dependencies in any repo.
- Existing module CSS prefix `.pm-lw-`, host `var(--terminal-*)` palette only.
- Commit prefixes: `feat(auth)`, `feat(server)`, `feat(listing)`, `fix(...)`, `test(...)`. Every task: commit + push (standing permission; auth-service pushes to its own GitLab remote).
- Auth-service repo path: `/Users/suenot/projects/server/auth-service` (clean tree at `f3610025`).
- Terminal repo path: `/Users/suenot/projects/trading/terminal/profitmaker-react`.

---

### Task 1: Auth-service — internal service-key minting endpoint

**Files:**
- Modify: `/Users/suenot/projects/server/auth-service/cmd/server/main.go` (handler + route registration next to `internalGroup`)
- Test: `/Users/suenot/projects/server/auth-service/cmd/server/service_keys_issue_test.go` (create)

**Interfaces:**
- Consumes: existing `generateAPIKeyRaw()`, `hashAPIKey()`, `cfg.InternalSecret`, tables `api_keys`, `service_roles`, `services`.
- Produces: `POST /api/v1/internal/service-keys/issue` — request `{requester_user_id string, service string, label string, ttl_hours int}`; response `{key, key_id, prefix, expires_at}`; errors: 503 secret unconfigured, 401 bad secret, 400 bad payload/unknown service, 403 no role, 429 active-key cap.

- [ ] **Step 1: Write failing tests** (pure validation unit `validateIssueRequest` — mirror `exchangeCredentialUpdateRequest.validate()` style):

```go
func TestIssueServiceKeyRequestValidation(t *testing.T) {
	tests := []struct {
		name    string
		req     issueServiceKeyRequest
		wantErr string
	}{
		{name: "ok defaults applied", req: issueServiceKeyRequest{RequesterUserID: "u1", Service: "listingapis"}},
		{name: "missing user", req: issueServiceKeyRequest{Service: "s"}, wantErr: "requester_user_id"},
		{name: "missing service", req: issueServiceKeyRequest{RequesterUserID: "u"}, wantErr: "service"},
		{name: "label default", req: issueServiceKeyRequest{RequesterUserID: "u", Service: "s"}, wantErr: ""}, // Label filled by validate
		{name: "ttl clamp low", req: issueServiceKeyRequest{RequesterUserID: "u", Service: "s", TTLHours: 0}},   // -> 168
		{name: "ttl clamp high", req: issueServiceKeyRequest{RequesterUserID: "u", Service: "s", TTLHours: 9999}}, // -> 720
	}
	// assert err substring like TestExchangeCredentialUpdateValidation; assert Label/TTLHours normalization
}
```

- [ ] **Step 2: Run `go test ./cmd/server/ -run TestIssueServiceKey -v`** — expect compile failure (`issueServiceKeyRequest` undefined).

- [ ] **Step 3: Implement** in `main.go` next to `createAPIKeyHandler`:

```go
// issueServiceKeyRequest is the internal mint contract (X-Internal-Secret plane).
type issueServiceKeyRequest struct {
	RequesterUserID string `json:"requester_user_id" binding:"required"`
	Service         string `json:"service" binding:"required"`
	Label           string `json:"label"`
	TTLHours        int    `json:"ttl_hours"`
}

func (r *issueServiceKeyRequest) validate() error {
	if strings.TrimSpace(r.RequesterUserID) == "" { return errors.New("requester_user_id is required") }
	if strings.TrimSpace(r.Service) == "" { return errors.New("service is required") }
	if r.Label == "" { r.Label = "issued:terminal" }
	if r.TTLHours <= 0 { r.TTLHours = 168 }
	if r.TTLHours > 720 { r.TTLHours = 720 }
	return nil
}

// internalIssueServiceKeyHandler mints a service-scoped API key for a user on
// the internal plane. Raw key crosses the wire exactly once; only key_hash is
// persisted. Prior ACTIVE keys with the same (user, service, label) are
// revoked first so a re-issuing client keeps at most one live key.
func internalIssueServiceKeyHandler(db *pgxpool.Pool, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.InternalSecret == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "internal secret not configured"})
			return
		}
		if c.GetHeader("X-Internal-Secret") != cfg.InternalSecret {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid internal secret"})
			return
		}
		var req issueServiceKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid payload"}); return }
		if err := req.validate(); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }

		// Service must be registered.
		var svcLabel string
		err := db.QueryRow(c.Request.Context(), `SELECT label FROM services WHERE name = $1`, req.Service).Scan(&svcLabel)
		if err != nil { c.JSON(400, gin.H{"error": "unknown service"}); return }

		// Requester must hold ANY role for the service.
		var role string
		err = db.QueryRow(c.Request.Context(),
			`SELECT role FROM service_roles WHERE user_id = $1 AND service = $2`, req.RequesterUserID, req.Service).Scan(&role)
		if err != nil { c.JSON(403, gin.H{"error": "no subscription for service"}); return }

		// Cap: max 10 active keys for (user, service).
		var active int
		if err := db.QueryRow(c.Request.Context(),
			`SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND $2 = ANY(scopes)
			 AND (expires_at IS NULL OR expires_at > NOW())`, req.RequesterUserID, req.Service).Scan(&active); err != nil {
			c.JSON(500, gin.H{"error": "failed to count keys"}); return
		}
		if active >= 10 { c.JSON(429, gin.H{"error": "too many active keys for service"}); return }

		// Revoke prior ACTIVE keys with the same label (one live terminal key).
		if _, err := db.Exec(c.Request.Context(),
			`DELETE FROM api_keys WHERE user_id = $1 AND label = $2 AND $3 = ANY(scopes)
			 AND (expires_at IS NULL OR expires_at > NOW())`, req.RequesterUserID, req.Label, req.Service); err != nil {
			c.JSON(500, gin.H{"error": "failed to revoke prior key"}); return
		}

		rawKey := generateAPIKeyRaw()
		keyHash := hashAPIKey(rawKey)
		prefix := rawKey[:16]
		expiresAt := time.Now().Add(time.Duration(req.TTLHours) * time.Hour)

		var keyID string
		err = db.QueryRow(c.Request.Context(),
			`INSERT INTO api_keys (user_id, key_hash, prefix, label, scopes, expires_at)
			 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			req.RequesterUserID, keyHash, prefix, req.Label, []string{req.Service}, expiresAt).Scan(&keyID)
		if err != nil { c.JSON(500, gin.H{"error": "failed to create key"}); return }

		c.JSON(http.StatusCreated, gin.H{"key": rawKey, "key_id": keyID, "prefix": prefix, "expires_at": expiresAt})
	}
}
```

Register in the `internalGroup` block: `internalGroup.POST("/service-keys/issue", internalIssueServiceKeyHandler(db, cfg))`.

- [ ] **Step 4: `go build ./... && go test ./cmd/server/ -run TestIssueServiceKey -v`** — green.
- [ ] **Step 5: Commit** in the auth-service repo: `feat(auth): internal service-key minting endpoint` + push to origin (GitLab).

---

### Task 2: Terminal core — host-minted module identity headers

**Files:**
- Create: `packages/server/src/modules/requestIdentity.ts`
- Modify: `packages/server/src/index.ts` (auth gate), `packages/server/src/modules/manager.ts` (`rewriteForModule`), `packages/sdk/src/types.ts` (contract docs)
- Test: `packages/server/src/modules/requestIdentity.spec.ts`, extend an existing auth-gate spec pattern

**Interfaces:**
- Produces: `recordRequestIdentity(request, {userId, authUserId})`, `peekRequestIdentity(request)`; module-visible headers `x-pm-user-id` (local user id), `x-pm-user-auth-id` (auth-service id), present only for session/SSO callers.

- [ ] **Step 1: Failing tests** — identity recorded for session/SSO paths; absent for `API_TOKEN`; `rewriteForModule` strips forged `x-pm-user-*` and injects recorded values. Mirror the boot pattern of an existing server spec (e.g. `accounts.spec.ts`) for the gate test; unit-test rewrite with a bare Request.

- [ ] **Step 2: Implement `requestIdentity.ts`**:

```ts
/**
 * Host-minted caller identity for module dispatch. The auth gate resolves the
 * caller (local session or SSO JWT) and records the identity here; the module
 * dispatcher injects ONLY the opaque ids as `x-pm-user-*` headers. Credentials
 * never cross the module boundary, and client-supplied identity headers are
 * stripped before injection — identity is minted by the host, never asserted
 * by the caller. WeakMap: identity lives exactly as long as the Request.
 */
export interface RequestIdentity { userId: string; authUserId: string | null; }
const identities = new WeakMap<Request, RequestIdentity>();
export function recordRequestIdentity(request: Request, identity: RequestIdentity): void {
  identities.set(request, identity);
}
export function peekRequestIdentity(request: Request): RequestIdentity | undefined {
  return identities.get(request);
}
```

- [ ] **Step 3: Wire the gate** (`index.ts:onBeforeHandle`): after `validateSession(db, token)` success → `recordRequestIdentity(request, {userId: user.id, authUserId: user.ssoUserId ?? null})`; after `getSsoUserFromToken` success → `recordRequestIdentity(request, {userId: ssoUser.id, authUserId: ssoUser.authUserId})`. (`API_TOKEN` path records nothing.)

- [ ] **Step 4: Wire `rewriteForModule`** (`manager.ts`): after the existing deletes add:

```ts
// Identity is host-minted: drop caller assertions, then set recorded identity.
sanitized.delete('x-pm-user-id');
sanitized.delete('x-pm-user-auth-id');
const identity = peekRequestIdentity(request);
if (identity) {
  sanitized.set('x-pm-user-id', identity.userId);
  if (identity.authUserId) sanitized.set('x-pm-user-auth-id', identity.authUserId);
}
```

- [ ] **Step 5: SDK contract doc** — `types.ts` `BackendModuleContext` comment: routes may read `x-pm-user-id`/`x-pm-user-auth-id` (host-minted caller identity; absent for server-to-server calls; never trust client-supplied values — the host strips them).
- [ ] **Step 6: `bun run typecheck && bun run --filter '@profitmaker/server' test`** (or repo equivalent) — green.
- [ ] **Step 7: Commit** `feat(server): host-minted module identity headers` + push.

---

### Task 3: Module — key resolver (mint + cache + re-mint)

**Files:**
- Create: `modules/listing/src/backend/keyResolver.ts`
- Test: `modules/listing/src/backend/keyResolver.test.ts`

**Interfaces:**
- Consumes: `POST {AUTH_INTERNAL_URL|https://auth.marketmaker.cc}/api/v1/internal/service-keys/issue` with `X-Internal-Secret` from env `AUTH_INTERNAL_SECRET`.
- Produces:

```ts
export type KeyResult =
  | { ok: true; key: string; expiresAt: number }
  | { ok: false; reason: 'bridge-unconfigured' | 'auth-unavailable' | 'no-subscription' | 'cap' | 'bad-response' };
export function createKeyResolver(deps: {
  authInternalUrl: string; authInternalSecret: string; fetchImpl?: FetchLike;
}): {
  getKey(userId: string, opts?: { force?: boolean }): Promise<KeyResult>;
  invalidate(userId: string): void;
};
```

- [ ] **Step 1: Failing tests** (injected fetchImpl): happy path caches per user (1 fetch for 2 calls); `force` re-mints; TTL <12h remaining re-mints; 403 → `no-subscription`; 429 → `cap`; network throw → `auth-unavailable`; non-JSON → `bad-response`; empty secret → `bridge-unconfigured` without fetching; key/secret never logged (assert no console output via spy).
- [ ] **Step 2: Implement** — in-memory `Map<userId, {key, expiresAt}>`; POST issue `{requester_user_id: userId, service: 'listingapis', label: 'profitmaker-terminal', ttl_hours: 168}`; map statuses; never throw.
- [ ] **Step 3: `bun run test` green; commit** `feat(listing): per-user key resolver`.

---

### Task 4: Module — per-user stream manager

**Files:**
- Create: `modules/listing/src/backend/userStreams.ts`
- Test: `modules/listing/src/backend/userStreams.test.ts`

**Interfaces:**
- Consumes: `createKeyResolver` (Task 3), `createSseService` (existing), `createListingApi`, `createListingRing`, `normalizeStreamEvent`.
- Produces:

```ts
export interface UserStream {
  ring: ListingRing;
  onListing(cb: (l: ModuleListing) => void): void;
  onStatus(cb: (s: SseStatus) => void): void;
  status(): SseStatus;
}
export function createUserStreams(deps: {
  authInternalUrl: string; authInternalSecret: string; apiBaseUrl: string;
  fetchImpl?: FetchLike; limit?: number /* default 50 */; idleMs?: number /* default 60_000 */;
}): {
  acquire(userId: string): Promise<{ ok: true; stream: UserStream } | { ok: false; reason: KeyResult['reason'] | 'cap' }>;
  subscriberAdded(userId: string): void; subscriberRemoved(userId: string): void;
  activeCount(): number; dispose(): void;
};
```

- [ ] **Step 1: Failing tests**: lazy acquire creates one SSE service per user (resolver called once); two acquires same user share; `subscriberRemoved` by all subscribers + `idleMs` (fake timers) tears down (SSE stopped, ring dropped, next acquire re-mints); limit cap → `cap`; dispose stops everything; key resolution failure propagates reason; per-user rings isolated; upstream 401 status → resolver `invalidate(userId)` + stream torn down (next acquire re-mints).
- [ ] **Step 2: Implement** — `Map<userId, {sse: SseService, ring, listeners, subscribers: number, idleTimer?: ReturnType<typeof setTimeout>}>`; acquire resolves key first (failure → no entry); builds per-user `createListingApi({apiKey: userKey})` + `createSseService` (reuse `sse.ts` verbatim — it is key-agnostic via `deps.api`); `sse.start()`. Wire the SSE service's 401/auth-error status to `resolver.invalidate(userId)` + teardown of that user's entry (design D3: re-mint on upstream 401).
- [ ] **Step 3: Tests green; commit** `feat(listing): per-user stream manager`.

---

### Task 5: Module — `/stream` route, per-user backfill, boot rework

**Files:**
- Modify: `modules/listing/src/backend/index.ts`, `modules/listing/src/backend/sse.ts` (no changes expected — confirm), tests
- Test: `modules/listing/src/backend/index.test.ts` (extend)

**Interfaces:**
- Consumes: Tasks 3-4; `x-pm-user-id` header (Task 2).
- Produces: `GET /stream` (SSE downstream per user), `GET /listings/recent` per-user, global SSE service REMOVED from boot.

- [ ] **Step 1: Failing tests**: `/stream` without `x-pm-user-id` → 401 `{error:'user identity required'}`; with identity → 200 `text/event-stream`, first frame `event: hello`, pushed listing frames relayed, heartbeat comment every 25s (fake timers), `request.signal` abort → subscriberRemoved called; `/listings/recent` reads calling user's ring (401 without identity); boot no longer starts global SSE nor emits socket listing events (existing socket-based tests updated); `/trends|/stats|/exchanges|/status` unchanged (poller + server key).
- [ ] **Step 2: Implement `/stream`** — Elysia handler returning a `new Response(readable, {headers: {'content-type':'text/event-stream','cache-control':'no-store'}})`; writer enqueues `event: hello\ndata: {...}\n\n`, subscribes stream callbacks, 25s heartbeat via interval tied to `request.signal.abort`; on abort → `subscriberRemoved(userId)`.
- [ ] **Step 3: Boot rework** — `buildModule`: remove global SSE service + `io.emit('listing'/'status')` wiring; keep poller + shared routes; instantiate `userStreams` (env `AUTH_INTERNAL_SECRET`/`AUTH_INTERNAL_URL`); `stop()` disposes it. Missing BOTH `LISTINGAPIS_API_KEY` and `AUTH_INTERNAL_SECRET` → module still boots; every route answers its own config error.
- [ ] **Step 4: Full module verify (`typecheck && test && build`); commit** `feat(listing): per-user live stream route`.

---

### Task 6: Module — Live widget on `/stream`

**Files:**
- Create: `modules/listing/src/frontend/streamClient.ts` + test
- Modify: `modules/listing/src/frontend/LiveListings.tsx` (socket → stream), `style.css` if needed

**Interfaces:**
- Consumes: `GET /api/modules/listing/stream` via `terminal.api.fetch` (streaming body reader), existing alert pipeline helpers.
- Produces: `subscribeListingStream({url, fetch, onListing, onStatus, onError}): { close() }` — SSE frame parser (reuses `\n\n` framing), auto-reconnect backoff 1s→60s, `Close`/`Vary` handling; widget states: `no-identity`, `no-subscription`, `billing` (402 status event), `busy` (503 cap), `error`.

- [ ] **Step 1: Failing tests** (parser): frame split, event/data extraction, heartbeat comments ignored, partial-chunk buffering, multi-line data. Reconnect: on stream end schedules retry (fake timers), closes cleanly.
- [ ] **Step 2: Implement client + rewire widget** — replace `useModuleSocket('listing')` listing/status handlers with one `subscribeListingStream` subscription (effect keyed on `cfg` as today); banners map stream error states (no-identity → "sign in required", no-subscription → "listingapis subscription required at auth.marketmaker.cc", billing → existing amber banner); backfill `/listings/recent` unchanged (route now per-user). Socket usage removed from Live widget entirely.
- [ ] **Step 3: Module verify green; commit** `feat(listing): live widget per-user stream client`.

---

### Task 7: Docs, version, publish

**Files:**
- Modify: `modules/listing/package.json` (version `0.2.0`), `modules/listing/README.md`, `modules/listing/src/shared/types.ts` (public stream status union if changed)

- [ ] **Step 1: README** — per-user billing section: what users need (listingapis role at auth.marketmaker.cc, MM balance), env vars (`AUTH_INTERNAL_SECRET` required for Live, `AUTH_INTERNAL_URL` optional, `LISTINGAPIS_API_KEY` now shared widgets only), operator cost note (3 calls / 5 min).
- [ ] **Step 2: Version 0.2.0; root + module typecheck/tests/build; `npm publish --dry-run`** (real publish after user confirms).
- [ ] **Step 3: Commit** `feat(listing): 0.2.0 per-user billing docs` + push.

---

## Final verification (after Task 7)

Whole-branch reviews per SDD; live smoke against prod auth-service only with user's blessing (mint one real key, one real stream connect, verify billing event lands).
