/**
 * Central exchange-account credential fetch + account proxy helpers against the
 * MarketMaker auth service (https://auth.marketmaker.cc).
 *
 * Two trust planes live here, and they must never be confused:
 *
 *  1. INTERNAL plane — `fetchCredentials()` calls the server-to-server endpoint
 *     `POST /api/v1/internal/exchange-credentials` with the shared header
 *     `X-Internal-Secret` (env `AUTH_INTERNAL_SECRET`). This is the ONLY place
 *     plaintext exchange keys ever exist in this process. The browser never sees
 *     this secret and never receives the keys it unlocks.
 *
 *  2. USER plane — `proxyMeExchanges()` forwards account-management calls to
 *     `/api/v1/me/exchanges*` using the CALLER's own SSO bearer JWT. No internal
 *     secret is involved; auth scopes the response to that user.
 *
 * SECURITY: never log the internal secret, the bearer JWT, or any returned key
 * material. Errors are surfaced as codes/messages with no secret content.
 */

// Internal (server↔auth) base + path. AUTH_INTERNAL_URL lets ops point the
// internal calls at a private address; defaults to the public auth host.
const AUTH_INTERNAL_URL = (process.env.AUTH_INTERNAL_URL || 'https://auth.marketmaker.cc').replace(/\/$/, '');
const INTERNAL_CREDS_PATH = '/api/v1/internal/exchange-credentials';

// The user-plane proxy reuses the public AUTH_URL (same host the client's SSO
// JWT was minted for), independent of the internal address above.
const AUTH_URL = (process.env.AUTH_URL || 'https://auth.marketmaker.cc').replace(/\/$/, '');

// Server-to-server shared secret. MUST equal the auth service's
// `AUTH_INTERNAL_SECRET`. Absent ⇒ the accountId trading flow is unavailable
// (fetchCredentials throws a clear 503), but the rest of the server still boots.
const AUTH_INTERNAL_SECRET = process.env.AUTH_INTERNAL_SECRET || '';

export type AccessWant = 'trade' | 'read';

/** Resolved credentials returned to the /api/exchange layer (kept in-process). */
export interface ResolvedCredentials {
  apiKey: string;
  secret: string;
  password?: string;
  /** The access level the auth service actually granted for this fetch. */
  accessLevel: AccessWant;
  /** True when the credential/grant is read-only (server must never trade). */
  readOnly: boolean;
  credentialId: string;
  ownerUserId: string;
}

/**
 * Typed error so callers can map auth-service outcomes onto HTTP status codes
 * without leaking secret content. `status` mirrors the auth response (or 503
 * when the secret is unconfigured / the auth service is unreachable).
 */
export class AuthAccountsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Auth-reported access level, when the failure was an access decision. */
    public readonly accessLevel?: AccessWant,
    public readonly readOnly?: boolean,
  ) {
    super(message);
    this.name = 'AuthAccountsError';
  }
}

// --- short-TTL credential cache ------------------------------------------------
// Keyed by (ssoUserId|credentialId|want). TTL ≤60s keeps a tight blast radius if
// a grant is revoked while caching: at most one minute of stale access. Cached
// values hold plaintext keys IN MEMORY ONLY — never persisted, never logged.
const CRED_TTL_MS = 60_000;
interface CacheEntry { value: ResolvedCredentials; expiresAt: number; }
const credCache = new Map<string, CacheEntry>();

function cacheKey(ssoUserId: string, credentialId: string, want: AccessWant): string {
  return `${ssoUserId}|${credentialId}|${want}`;
}

interface InternalCredsResponse {
  api_key?: string;
  api_secret?: string;
  passphrase?: string;
  credential_id?: string;
  owner_user_id?: string;
  access_level?: AccessWant;
  read_only?: boolean;
  error?: string;
}

/**
 * Resolve decrypted exchange credentials for a user + credential at a requested
 * access level, via the auth internal endpoint.
 *
 * @throws AuthAccountsError 503 when the internal secret is unconfigured or auth
 *   is unreachable; 403 when the requester lacks a sufficient grant, or asked for
 *   `trade` on a read-only/read-grant credential; 404 unknown credential; 401/400
 *   on a bad internal request (these should not happen in normal operation).
 */
export async function fetchCredentials(args: {
  ssoUserId: string;
  credentialId: string;
  want?: AccessWant;
}): Promise<ResolvedCredentials> {
  const want: AccessWant = args.want ?? 'trade';
  const { ssoUserId, credentialId } = args;

  if (!AUTH_INTERNAL_SECRET) {
    throw new AuthAccountsError(503, 'central account credentials are not configured on this server');
  }

  const key = cacheKey(ssoUserId, credentialId, want);
  const hit = credCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let res: Response;
  try {
    res = await fetch(`${AUTH_INTERNAL_URL}${INTERNAL_CREDS_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Server-to-server secret. NEVER logged.
        'X-Internal-Secret': AUTH_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        credential_id: credentialId,
        requester_user_id: ssoUserId,
        want,
      }),
    });
  } catch {
    // Network/DNS/TLS failure reaching auth — not the caller's fault.
    throw new AuthAccountsError(503, 'auth service is unreachable');
  }

  let payload: InternalCredsResponse = {};
  try {
    payload = (await res.json()) as InternalCredsResponse;
  } catch {
    // Non-JSON body (e.g. an upstream proxy error page).
    if (!res.ok) throw new AuthAccountsError(res.status === 401 ? 503 : res.status, 'credential fetch failed');
  }

  if (!res.ok) {
    // 401 from the internal endpoint means OUR secret is wrong/missing — that is
    // a server misconfiguration, not a client problem, so surface it as 503.
    if (res.status === 401 || res.status === 503) {
      throw new AuthAccountsError(503, 'central account credentials are misconfigured on this server');
    }
    if (res.status === 403) {
      throw new AuthAccountsError(
        403,
        payload.error || 'not permitted for this account at the requested access level',
        payload.access_level,
        payload.read_only,
      );
    }
    if (res.status === 404) {
      throw new AuthAccountsError(404, 'exchange account not found');
    }
    throw new AuthAccountsError(res.status || 502, payload.error || 'credential fetch failed');
  }

  if (!payload.api_key || !payload.api_secret) {
    throw new AuthAccountsError(502, 'auth returned an incomplete credential');
  }

  // Defense in depth: if we asked to trade but auth handed back a read-only
  // result, refuse here too rather than letting a trade proceed.
  const accessLevel: AccessWant = payload.access_level ?? want;
  const readOnly = payload.read_only ?? (accessLevel === 'read');
  if (want === 'trade' && (accessLevel !== 'trade' || readOnly)) {
    throw new AuthAccountsError(403, 'account is read-only; trading is not permitted', accessLevel, readOnly);
  }

  const value: ResolvedCredentials = {
    apiKey: payload.api_key,
    secret: payload.api_secret,
    password: payload.passphrase || undefined,
    accessLevel,
    readOnly,
    credentialId: payload.credential_id || credentialId,
    ownerUserId: payload.owner_user_id || '',
  };

  credCache.set(key, { value, expiresAt: Date.now() + CRED_TTL_MS });
  return value;
}

/** Test/maintenance hook: drop all cached credentials immediately. */
export function clearCredentialCache(): void {
  credCache.clear();
}

// --- user-plane account-management proxy --------------------------------------

export interface ProxyResult {
  status: number;
  /** Parsed JSON body from auth, or a synthesized error body. */
  body: unknown;
}

/**
 * Forward an account-management request to auth `/api/v1/me/exchanges*` using the
 * caller's own SSO bearer JWT. The terminal stays a single API origin and the
 * browser never calls auth cross-origin. Pass auth's JSON + status straight back.
 *
 * `subPath` is appended to `/api/v1/me/exchanges` (e.g. '', '/:id', '/:id/grants').
 */
export async function proxyMeExchanges(args: {
  bearer: string;
  method: 'GET' | 'POST' | 'DELETE';
  subPath?: string;
  body?: unknown;
}): Promise<ProxyResult> {
  const { bearer, method, subPath = '', body } = args;
  const url = `${AUTH_URL}/api/v1/me/exchanges${subPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return { status: 503, body: { error: 'auth service is unreachable' } };
  }

  // Pass through auth's JSON. If the body isn't JSON, synthesize one preserving
  // the status so the client still sees the right code.
  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = { error: 'auth returned a non-JSON response' }; }
  }
  return { status: res.status, body: parsed };
}
