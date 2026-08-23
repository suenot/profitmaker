import type { ModuleListing, SseStatus } from '../shared/types';
import { createListingApi, type FetchLike } from './apiClient';
import { createKeyResolver, type KeyResult } from './keyResolver';
import { createListingRing, type ListingRing } from './ringBuffer';
import { createSseService, type SseService } from './sse';

/** Handle onto one user's live stream: their ring plus fan-out subscriptions. */
export interface UserStream {
  ring: ListingRing;
  /** Register a listener; the return value unsubscribes it. */
  onListing(cb: (l: ModuleListing) => void): () => void;
  /** Register a listener; the return value unsubscribes it. */
  onStatus(cb: (s: SseStatus) => void): () => void;
  status(): SseStatus;
  /**
   * False once the entry was torn down (idle timeout, upstream 401, dispose).
   * A torn-down stream goes silent — poll this to notice and reconnect.
   */
  isLive(): boolean;
}

export type UserStreamFailReason = Extract<KeyResult, { ok: false }>['reason'];

export type AcquireResult =
  | {
      ok: true;
      stream: UserStream;
      /**
       * Release THIS acquire's hold — and only this acquire's. Bound to the
       * entry the acquire landed on: after a teardown (e.g. upstream 401) a
       * reconnect creates a successor entry, and a stale connection releasing
       * by authUserId would eat the successor's subscriber count. Idempotent.
       */
      release(): void;
    }
  | { ok: false; reason: UserStreamFailReason };

export interface UserStreamsDeps {
  authInternalUrl: string;
  authInternalSecret: string;
  apiBaseUrl: string;
  fetchImpl?: FetchLike;
  /** Max simultaneously live per-user streams (default 50). */
  limit?: number;
  /** How long a zero-subscriber entry stays live before teardown (default 60s). */
  idleMs?: number;
}

export interface UserStreams {
  acquire(authUserId: string): Promise<AcquireResult>;
  subscriberAdded(authUserId: string): void;
  subscriberRemoved(authUserId: string): void;
  activeCount(): number;
  dispose(): void;
}

const RING_SIZE = 50;
const DEFAULT_LIMIT = 50;
const DEFAULT_IDLE_MS = 60_000;
/**
 * The resolver never negatively caches a failed mint, so this side owns the
 * pacing: after a failed acquire the user is parked for 30s and /stream retries
 * answer the parked reason without touching auth-service again.
 */
const FAILURE_BACKOFF_MS = 30_000;

interface Entry {
  sse: SseService;
  ring: ListingRing;
  view: UserStream;
  subscribers: number;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Per-user listing streams, keyed by auth-service user id (the host's
 * x-pm-user-auth-id — the same id space the key resolver mints against). Each
 * user gets their own minted ListingAPIs key (via the auth-service internal
 * bridge), their own SSE connection, ring and listener sets; entries are
 * created lazily on first acquire, shared across concurrent acquires of the
 * same user, and torn down idleMs after the last subscriber leaves (or
 * immediately when the upstream rejects the key with a 401 — the key is
 * invalidated so the next acquire re-mints).
 *
 * Never logs: key material and the internal secret must not reach any output
 * stream.
 */
export function createUserStreams(deps: UserStreamsDeps): UserStreams {
  const doFetch = deps.fetchImpl ?? fetch;
  const limit = deps.limit ?? DEFAULT_LIMIT;
  const idleMs = deps.idleMs ?? DEFAULT_IDLE_MS;
  const listingBase = deps.apiBaseUrl.replace(/\/+$/, '');
  const resolver = createKeyResolver({
    authInternalUrl: deps.authInternalUrl,
    authInternalSecret: deps.authInternalSecret,
    fetchImpl: doFetch,
  });
  const entries = new Map<string, Entry>();
  /** Cold acquires in flight, keyed by auth user: parallel callers share one mint and one entry. */
  const pending = new Map<string, Promise<{ ok: true; entry: Entry } | { ok: false; reason: UserStreamFailReason }>>();
  /** Parked mint failures: until passes, acquire answers the stored reason without a resolver call. */
  const backoff = new Map<string, { until: number; reason: UserStreamFailReason }>();
  let disposed = false;

  function cancelIdle(entry: Entry): void {
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer);
      entry.idleTimer = undefined;
    }
  }

  /**
   * Count one subscriber on `entry` and return its entry-scoped release. The
   * release only ever touches the entry it was minted for: a torn-down entry
   * decrements harmlessly, and the idle timer is armed only when the entry is
   * still the live one in the map — so a stale connection (its entry already
   * dead, a successor re-acquired) can never eat the successor's count.
   */
  function claim(authUserId: string, entry: Entry): () => void {
    cancelIdle(entry); // a live subscriber cancels any pending idle teardown
    entry.subscribers += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (entry.subscribers === 0) return;
      entry.subscribers -= 1;
      if (entry.subscribers === 0 && entries.get(authUserId) === entry) {
        cancelIdle(entry);
        entry.idleTimer = setTimeout(() => {
          entry.idleTimer = undefined;
          teardown(authUserId);
        }, idleMs);
      }
    };
  }

  function teardown(authUserId: string): void {
    const entry = entries.get(authUserId);
    if (!entry) return;
    cancelIdle(entry);
    entries.delete(authUserId);
    entry.sse.stop();
  }

  /**
   * A 401 from the listing API means the minted key died mid-flight: drop the
   * resolver cache so the next acquire re-mints, and tear the dead stream down.
   */
  function onUpstreamAuthFailure(authUserId: string): void {
    resolver.invalidate(authUserId);
    teardown(authUserId);
  }

  /** Per-user fetch wrapper: watches listing-API responses for key rejection. */
  function guardedFetch(authUserId: string): FetchLike {
    return async (input, init) => {
      const res = await doFetch(input, init);
      if (res.status === 401 && String(input).startsWith(listingBase)) onUpstreamAuthFailure(authUserId);
      return res;
    };
  }

  async function coldAcquire(authUserId: string): Promise<{ ok: true; entry: Entry } | { ok: false; reason: UserStreamFailReason }> {
    const parked = backoff.get(authUserId);
    if (parked) {
      if (parked.until > Date.now()) return { ok: false, reason: parked.reason };
      backoff.delete(authUserId);
    }
    // Pending cold acquires hold a slot too: without them a burst of first-time
    // users would all pass the check before any entry exists.
    if (entries.size + pending.size >= limit) return { ok: false, reason: 'cap' };

    const key = await resolver.getKey(authUserId);
    if (disposed) return { ok: false, reason: 'auth-unavailable' };
    if (!key.ok) {
      backoff.set(authUserId, { until: Date.now() + FAILURE_BACKOFF_MS, reason: key.reason });
      return { ok: false, reason: key.reason };
    }
    backoff.delete(authUserId);

    const fetchForUser = guardedFetch(authUserId);
    const ring = createListingRing(RING_SIZE);
    const listingListeners = new Set<(l: ModuleListing) => void>();
    const statusListeners = new Set<(s: SseStatus) => void>();
    const api = createListingApi({ baseUrl: deps.apiBaseUrl, apiKey: key.key, fetchImpl: fetchForUser });
    const sse = createSseService({
      baseUrl: deps.apiBaseUrl,
      apiKey: key.key,
      api,
      ring,
      fetchImpl: fetchForUser,
      onListing: (l) => { for (const cb of listingListeners) cb(l); },
      onStatus: (s) => { for (const cb of statusListeners) cb(s); },
    });
    const view: UserStream = {
      ring,
      onListing: (cb) => {
        listingListeners.add(cb);
        return () => { listingListeners.delete(cb); };
      },
      onStatus: (cb) => {
        statusListeners.add(cb);
        return () => { statusListeners.delete(cb); };
      },
      status: () => sse.getStatus().status,
      isLive: () => entries.get(authUserId) === entry,
    };
    const entry: Entry = { sse, ring, view, subscribers: 0 };
    entries.set(authUserId, entry);
    sse.start();
    return { ok: true, entry };
  }

  return {
    async acquire(authUserId) {
      const existing = entries.get(authUserId);
      if (existing) return { ok: true, stream: existing.view, release: claim(authUserId, existing) };
      if (disposed) return { ok: false, reason: 'auth-unavailable' };
      let inFlight = pending.get(authUserId);
      if (!inFlight) {
        inFlight = coldAcquire(authUserId).finally(() => pending.delete(authUserId));
        pending.set(authUserId, inFlight);
      }
      const res = await inFlight;
      if (!res.ok) return { ok: false, reason: res.reason };
      // Every caller of a shared mint is a subscriber; claim() also cancels
      // any idle teardown a predecessor's removal may have armed between the
      // continuations. Each caller gets a release bound to THIS entry.
      return { ok: true, stream: res.entry.view, release: claim(authUserId, res.entry) };
    },

    subscriberAdded(authUserId) {
      const entry = entries.get(authUserId);
      if (entry) cancelIdle(entry);
    },

    subscriberRemoved(authUserId) {
      const entry = entries.get(authUserId);
      if (!entry || entry.subscribers === 0) return;
      entry.subscribers -= 1;
      if (entry.subscribers === 0) {
        cancelIdle(entry);
        entry.idleTimer = setTimeout(() => {
          entry.idleTimer = undefined;
          teardown(authUserId);
        }, idleMs);
      }
    },

    activeCount: () => entries.size,

    dispose() {
      disposed = true;
      for (const entry of entries.values()) {
        cancelIdle(entry);
        entry.sse.stop();
      }
      entries.clear();
      pending.clear();
      backoff.clear();
    },
  };
}
