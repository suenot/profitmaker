# Security

## Overview

Profitmaker is backend-required: all trading and private data go through the
**terminal server**, which talks to exchanges via CCXT. There are two ways to
authenticate and two places exchange API keys can live, depending on how you run
the terminal:

- **Self-host** — register/login locally (bcrypt, 30-day sessions in
  PostgreSQL). You supply exchange credentials per request; the server forwards
  them to the exchange and never persists them.
- **Ecosystem SSO** — single sign-on via `auth.marketmaker.cc`. Exchange API
  keys are stored **server-side** in the auth vault; the browser never holds
  secrets. This is how the hosted terminal at `terminal.marketmaker.cc` runs.

Both modes share one rule: **every `/api/*` request requires a bearer token**,
and exchange secrets are never sent to any third party other than the exchange
itself.

## Authentication

The server accepts three kinds of bearer token, checked in order on every
`/api/*` and `/ws` request (`packages/server/src/index.ts` `onBeforeHandle`):

1. **`API_TOKEN`** — a server-to-server secret (env `API_TOKEN`). Maps to the
   single bootstrap user. Intended for agents, scripts, and `curl`.
2. **Local session token** — a random UUID issued by `POST /api/auth/login`,
   validated against the `sessions` table.
3. **SSO JWT** — an RS256 token from `auth.marketmaker.cc`, verified against the
   auth service's **public JWKS** (`packages/server/src/services/ssoAuth.ts`).

If none match, the request is rejected (401 with no token, 403 with an invalid
one). The Socket.IO handshake (`authenticate`) uses the same resolution order.

### Local auth (self-host)

`packages/server/src/services/auth.ts`:

- Passwords hashed with **bcrypt** (12 rounds, `@node-rs/bcrypt`).
- Sessions are random UUID tokens stored in PostgreSQL with a **30-day**
  expiry; expired sessions are swept hourly.
- `POST /api/auth/register | login | logout`, `GET /api/auth/me`.

### Ecosystem SSO

`packages/server/src/services/ssoAuth.ts`:

- Tokens are **RS256 JWTs**. The server verifies them with the auth service's
  **public JWKS** (`/.well-known/jwks.json`) — **no shared secret for token
  verification ever lives in this (public) repo**. The algorithm is pinned to
  `RS256` so a token can't assert a weaker alg.
- A verified SSO identity is bound to a local user row **explicitly** by
  `sso_user_id` (never silently by email). An email already bound to a different
  SSO identity is refused (returns null → 403), closing the account-takeover
  vector. Unbound existing emails are adopted once; unknown users are
  auto-provisioned.
- `auth.marketmaker.cc` is overridable for dev/staging via `AUTH_URL`.

On the client (`packages/client/src/services/ssoClient.ts`), the terminal runs on
a `*.marketmaker.cc` subdomain and shares the ecosystem **`mm_session` cookie**.
On load it silently bootstraps a session by calling auth's
`/api/v1/auth/session` with `credentials: 'include'`; a valid cookie returns a
fresh JWT, which becomes the bearer the terminal presents to its own server.

#### Multiple simultaneous logins

`packages/client/src/services/sessionManager.ts` holds **N ecosystem sessions at
once, one active**, in `localStorage` (`profitmaker.sso.sessions`).

- Quick-switch the active identity; "Add login" appends a new identity
  (`/login?prompt=login`) without clobbering the others.
- `getSsoToken()` returns the **active** session's token, so every downstream
  consumer follows the active identity automatically.
- A JWT past its `exp` is flagged `stale` and its token is withheld until
  re-login (there is no refresh flow today).

## Central Accounts (SSO mode)

In SSO mode, exchange API keys are **not** stored in this server or the browser.
They live in the `auth.marketmaker.cc` vault, encrypted there, and are fetched
server-to-server only when a call needs them.

### How a private call resolves keys

When the browser makes an authenticated call (balance, trades, orders,
positions, ledger, create/cancel order), it sends only:

```
{ accountId, want: 'read' | 'trade' }   + the user's SSO JWT
```

The server (`packages/server/src/routes/exchange.ts`,
`resolveAuthedConfig`) then:

1. Verifies the SSO context from the bearer JWT
   (`getSsoContextFromRequest`). No JWT → 401.
2. Calls the auth **internal** endpoint
   `POST /api/v1/internal/exchange-credentials` with the server-only header
   `X-Internal-Secret` (env `AUTH_INTERNAL_SECRET`) to fetch the decrypted keys
   for `{ accountId, want }`
   (`packages/server/src/services/authAccounts.ts`, `fetchCredentials`).
3. Attaches the keys to the CCXT config in-process and makes the exchange call.

**The browser never holds exchange secrets, and never sees `AUTH_INTERNAL_SECRET`.**
Resolved keys are cached in server memory only, for ≤60s, keyed by
`(ssoUserId|credentialId|want)`; they are never persisted and never logged.

If `AUTH_INTERNAL_SECRET` is unset, the `accountId` flow returns 503 but the rest
of the server still boots.

### Per-account access levels

Accounts can be shared with other ecosystem users at **read** or **trade**
level, managed through `/api/accounts/*`
(`packages/server/src/routes/accounts.ts`), a thin proxy that forwards the
caller's own JWT to auth's `/api/v1/me/exchanges*`.

Access is enforced server-side, with defense in depth:

- `createOrder` / `cancelOrder` always request `want: 'trade'`; a body can never
  downgrade a trade op.
- Private reads (balance, trades, orders, positions, ledger) request
  `want: 'read'`.
- If `want: 'trade'` is requested against a read-only grant, auth refuses, and
  `fetchCredentials` **also** refuses locally — a trade on a read grant is
  rejected with **403**.

### Account management is metadata-only in the browser

`packages/client/src/store/accountStore.ts` adds an account by POSTing the keys
to `/api/accounts` (which forwards to the auth vault) and then keeps only the
returned **metadata** (`id`, `exchange`, `label`, `read_only`, `access_level`,
`shared`, …). The credential `id` is what later flows as `accountId`.

The legacy in-browser AES path (below) is retained **only** as a one-time
migration source: `migrateLegacyLocalAccounts()` reads any old `user-store`
localStorage accounts that still carry plaintext keys, pushes them up to the
auth vault, then `purgeLegacyLocalAccounts()` deletes the local copy.

## Self-Host Key Handling

Without SSO, there is no central vault. The terminal sends exchange credentials
to the server **inline per request**, inside the `config` object of an
`/api/exchange/*` call (`apiKey`, `secret`, `password`). The server:

- Holds keys in memory only for the lifetime of the cached CCXT instance.
- Does **not** persist them to disk.
- Requires inline `apiKey` + `secret` for any private operation when no
  `accountId` is present (`requireCreds`).

> **Note on at-rest storage.** A `exchange_accounts` table exists in the schema
> (`packages/server/src/db/schema/exchange_accounts.ts`) with
> `key_encrypted` / `secret_encrypted` / `password_encrypted` columns for a
> future server-side encrypted store, but **no route or service currently reads
> or writes it** — there is no server-side encryption helper yet. Until that
> lands, self-host credentials are supplied inline at call time (and held only in
> memory), not persisted in the DB.

### Legacy browser-side encryption (being phased out)

Earlier versions encrypted keys in the browser and stored them in localStorage.
That code still exists at `packages/client/src/utils/encryption.ts` but is now
used only by the migration importer described above.

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM (Web Crypto) |
| Key length | 256 bits |
| Salt length | 16 bytes |
| IV length | 12 bytes (random per encryption) |
| KDF | PBKDF2 |
| KDF iterations | 100,000 |
| KDF hash | SHA-256 |

The derived key was held in memory only (cleared on reload), and the encrypted
value was `Base64(IV ‖ ciphertext)`. New self-host installs do not need a master
password; ecosystem users never used this path at all.

## KuCoin Broker Pro (hosted only)

When the hosted terminal routes KuCoin trades, it attributes them to the
MarketMaker broker for rebate (`packages/server/src/services/ccxtCache.ts`). The
broker partner leg is read from server-side env vars
(`KUCOIN_BROKER_{SPOT,FUTURES}_{PARTNER,KEY,NAME}`); the **broker key is an HMAC
secret kept server-side only** — it is never exposed to the browser and never
prefixed `VITE_`. Self-host installs are unaffected: with no broker env vars set,
the attribution is a no-op.

## API Key Tiers

Following the original Kupi terminal philosophy, create separate exchange API
keys with the minimum permissions for each use:

| Tier | Permissions | Use Case |
|------|------------|----------|
| **Read-only** | balances, orders, trades, positions | Market data, portfolio display |
| **Trading** | place / cancel orders | Order management |
| **Withdrawals** | withdrawals | Reserved — not used by the terminal |

In SSO mode, a read-only account (or a read-only **grant**) is enforced
server-side: trade operations are rejected with 403, so a read-only key can't be
misused.

**Best practices:**

- Bind keys to your IP address on the exchange.
- Use read-only keys/accounts when you only need market data.
- Rotate keys immediately if you suspect compromise.

## Security Considerations

### Mitigations

- **No secrets in the browser (SSO mode)** — keys live in the auth vault and are
  fetched server-to-server; the browser only ever sends `{ accountId, want }`.
- **Every endpoint authenticated** — `/api/*` and `/ws` require a bearer token
  (API_TOKEN, local session, or SSO JWT via public JWKS).
- **RS256 + JWKS** — SSO tokens are verified with the auth service's public key;
  the alg is pinned, and no token-signing secret is in this repo.
- **Server-side access enforcement** — read-only grants can't trade (403),
  enforced by both auth and the terminal server.
- **Short credential cache** — fetched keys live in server memory for ≤60s and
  are never logged or persisted.

### Remaining risks

- **Inline self-host credentials over plain HTTP** — without TLS, inline keys
  travel in the clear on the local network. Run the server on localhost or
  behind TLS.
- **Server compromise** — the terminal server briefly holds plaintext keys in
  memory while a call is in flight (both modes); protect the host.
- **`AUTH_INTERNAL_SECRET` / `API_TOKEN` leakage** — these are server-to-server
  secrets; keep them out of the browser, logs, and the repo.
- **XSS / malicious browser extensions** — could read the SSO JWT from
  localStorage and act as the user (but cannot read exchange secrets, which are
  never in the browser in SSO mode).

### Recommendations

1. Bind API keys to your IP on the exchange and prefer read-only where possible.
2. Run the server behind TLS; set a strong `API_TOKEN`.
3. Keep `AUTH_INTERNAL_SECRET` and `API_TOKEN` server-side only — never `VITE_`.
4. Rotate exchange API keys regularly.
