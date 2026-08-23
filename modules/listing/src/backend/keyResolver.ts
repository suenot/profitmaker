import type { FetchLike } from './apiClient';

export type KeyResult =
  | { ok: true; key: string; expiresAt: number }
  | { ok: false; reason: 'bridge-unconfigured' | 'auth-unavailable' | 'no-subscription' | 'cap' | 'bad-response' };

export interface KeyResolverDeps {
  authInternalUrl: string;
  authInternalSecret: string;
  fetchImpl?: FetchLike;
}

export interface KeyResolver {
  getKey(authUserId: string, opts?: { force?: boolean }): Promise<KeyResult>;
  invalidate(authUserId: string): void;
}

/** A cached entry is reused only while at least this much ttl remains. */
const MIN_REMAINING_MS = 12 * 60 * 60 * 1000;
/** Bound a single mint so a hung auth service cannot pin the in-flight dedup forever. */
const MINT_TIMEOUT_MS = 10_000;

/**
 * Mints and caches per-user ListingAPIs service keys through the auth-service
 * internal bridge. Users are identified by their auth-service id (the host's
 * x-pm-user-auth-id): the bridge keys service_roles/api_keys on that id space,
 * so terminal-local user ids must never reach `requester_user_id`. Keys are
 * 168h-lived and re-minted transparently when the remaining ttl drops under
 * 12h or when the caller forces a refresh (e.g. after an upstream 401 — pair
 * with invalidate() there).
 *
 * getKey never throws and never logs: every failure is a typed KeyResult, and
 * the raw key / internal secret must not reach any output stream.
 */
export function createKeyResolver(deps: KeyResolverDeps): KeyResolver {
  const doFetch = deps.fetchImpl ?? fetch;
  const baseUrl = deps.authInternalUrl.replace(/\/+$/, '');
  const cache = new Map<string, { key: string; expiresAt: number }>();
  /** Mints in flight, keyed by auth user: parallel cold-cache callers share one POST. */
  const inFlight = new Map<string, Promise<KeyResult>>();

  async function mint(authUserId: string): Promise<KeyResult> {
    try {
      const res = await doFetch(`${baseUrl}/api/v1/internal/service-keys/issue`, {
        method: 'POST',
        headers: {
          'X-Internal-Secret': deps.authInternalSecret,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          requester_user_id: authUserId,
          service: 'listingapis',
          label: 'profitmaker-terminal',
          ttl_hours: 168,
        }),
        signal: AbortSignal.timeout(MINT_TIMEOUT_MS),
      });
      if (res.status === 403) return { ok: false, reason: 'no-subscription' };
      if (res.status === 429) return { ok: false, reason: 'cap' };
      if (res.status >= 500) return { ok: false, reason: 'auth-unavailable' };
      if (!res.ok) return { ok: false, reason: 'bad-response' };
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        return { ok: false, reason: 'bad-response' };
      }
      const key = (body as { key?: unknown } | null)?.key;
      const expiresAt = Date.parse((body as { expires_at?: unknown } | null)?.expires_at as string);
      if (typeof key !== 'string' || key === '' || !Number.isFinite(expiresAt)) {
        return { ok: false, reason: 'bad-response' };
      }
      cache.set(authUserId, { key, expiresAt });
      return { ok: true, key, expiresAt };
    } catch {
      return { ok: false, reason: 'auth-unavailable' };
    }
  }

  return {
    async getKey(authUserId: string, opts?: { force?: boolean }): Promise<KeyResult> {
      // No bridge secret configured is a deployment gap, not a fetch failure:
      // answer locally so the caller can surface "bridge-unconfigured" without
      // ever touching the network.
      if (!deps.authInternalSecret) return { ok: false, reason: 'bridge-unconfigured' };

      const cached = cache.get(authUserId);
      if (cached && !opts?.force && cached.expiresAt - Date.now() >= MIN_REMAINING_MS) {
        return { ok: true, key: cached.key, expiresAt: cached.expiresAt };
      }

      let pending = inFlight.get(authUserId);
      if (!pending) {
        pending = mint(authUserId).finally(() => inFlight.delete(authUserId));
        inFlight.set(authUserId, pending);
      }
      return pending;
    },

    invalidate(authUserId: string): void {
      cache.delete(authUserId);
    },
  };
}
