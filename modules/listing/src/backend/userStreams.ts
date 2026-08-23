import type { ModuleListing, SseStatus } from '../shared/types';
import { createListingApi, type FetchLike } from './apiClient';
import { createKeyResolver, type KeyResult } from './keyResolver';
import { createListingRing, type ListingRing } from './ringBuffer';
import { createSseService, type SseService } from './sse';

/** Handle onto one user's live stream: their ring plus fan-out subscriptions. */
export interface UserStream {
  ring: ListingRing;
  onListing(cb: (l: ModuleListing) => void): void;
  onStatus(cb: (s: SseStatus) => void): void;
  status(): SseStatus;
}

export type UserStreamFailReason = Extract<KeyResult, { ok: false }>['reason'];

export type AcquireResult =
  | { ok: true; stream: UserStream }
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
  acquire(userId: string): Promise<AcquireResult>;
  subscriberAdded(userId: string): void;
  subscriberRemoved(userId: string): void;
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
 * Per-user listing streams. Each user gets their own minted ListingAPIs key
 * (via the auth-service internal bridge), their own SSE connection, ring and
 * listener sets; entries are created lazily on first acquire, shared across
 * concurrent acquires of the same user, and torn down idleMs after the last
 * subscriber leaves (or immediately when the upstream rejects the key with a
 * 401 — the key is invalidated so the next acquire re-mints).
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
  /** Cold acquires in flight, keyed by user: parallel callers share one mint and one entry. */
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

  function teardown(userId: string): void {
    const entry = entries.get(userId);
    if (!entry) return;
    cancelIdle(entry);
    entries.delete(userId);
    entry.sse.stop();
  }

  /**
   * A 401 from the listing API means the minted key died mid-flight: drop the
   * resolver cache so the next acquire re-mints, and tear the dead stream down.
   */
  function onUpstreamAuthFailure(userId: string): void {
    resolver.invalidate(userId);
    teardown(userId);
  }

  /** Per-user fetch wrapper: watches listing-API responses for key rejection. */
  function guardedFetch(userId: string): FetchLike {
    return async (input, init) => {
      const res = await doFetch(input, init);
      if (res.status === 401 && String(input).startsWith(listingBase)) onUpstreamAuthFailure(userId);
      return res;
    };
  }

  async function coldAcquire(userId: string): Promise<{ ok: true; entry: Entry } | { ok: false; reason: UserStreamFailReason }> {
    const parked = backoff.get(userId);
    if (parked) {
      if (parked.until > Date.now()) return { ok: false, reason: parked.reason };
      backoff.delete(userId);
    }
    // Pending cold acquires hold a slot too: without them a burst of first-time
    // users would all pass the check before any entry exists.
    if (entries.size + pending.size >= limit) return { ok: false, reason: 'cap' };

    const key = await resolver.getKey(userId);
    if (disposed) return { ok: false, reason: 'auth-unavailable' };
    if (!key.ok) {
      backoff.set(userId, { until: Date.now() + FAILURE_BACKOFF_MS, reason: key.reason });
      return { ok: false, reason: key.reason };
    }
    backoff.delete(userId);

    const fetchForUser = guardedFetch(userId);
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
      onListing: (cb) => { listingListeners.add(cb); },
      onStatus: (cb) => { statusListeners.add(cb); },
      status: () => sse.getStatus().status,
    };
    const entry: Entry = { sse, ring, view, subscribers: 0 };
    entries.set(userId, entry);
    sse.start();
    return { ok: true, entry };
  }

  return {
    async acquire(userId) {
      const existing = entries.get(userId);
      if (existing) {
        cancelIdle(existing); // a live subscriber cancels any pending idle teardown
        existing.subscribers += 1;
        return { ok: true, stream: existing.view };
      }
      if (disposed) return { ok: false, reason: 'auth-unavailable' };
      let inFlight = pending.get(userId);
      if (!inFlight) {
        inFlight = coldAcquire(userId).finally(() => pending.delete(userId));
        pending.set(userId, inFlight);
      }
      const res = await inFlight;
      if (!res.ok) return { ok: false, reason: res.reason };
      res.entry.subscribers += 1; // every caller of a shared mint is a subscriber
      return { ok: true, stream: res.entry.view };
    },

    subscriberAdded(userId) {
      const entry = entries.get(userId);
      if (entry) cancelIdle(entry);
    },

    subscriberRemoved(userId) {
      const entry = entries.get(userId);
      if (!entry || entry.subscribers === 0) return;
      entry.subscribers -= 1;
      if (entry.subscribers === 0) {
        cancelIdle(entry);
        entry.idleTimer = setTimeout(() => {
          entry.idleTimer = undefined;
          teardown(userId);
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
