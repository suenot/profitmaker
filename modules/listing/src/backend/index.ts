import { Elysia } from 'elysia';
import type { BackendModule, BackendModuleContext, BackendModuleHandles, ModuleJobs } from '@profitmaker/module-sdk';
import type { RouteStatus } from '../shared/types';
import { AuthError, BillingError, createListingApi, type FetchLike } from './apiClient';
import { startPoller, type PollerCache } from './poller';
import { createUserStreams, type UserStream, type UserStreamFailReason, type UserStreams } from './userStreams';

/** DI seam for tests: inject a fake fetch and/or env without touching process.env. */
export interface BuildDeps {
  fetchImpl?: FetchLike;
  env?: Record<string, string | undefined>;
  /** Test seam: shrink the per-user stream pool (limit) or its idle window (idleMs). */
  userStreamsTuning?: { limit?: number; idleMs?: number };
}

/** Downstream heartbeat cadence on /stream (SSE comment frame). */
const HEARTBEAT_MS = 25_000;
/** Frames a stalled downstream client may owe before /stream closes on it. */
const DOWNSTREAM_QUEUE_FRAMES = 64;
/** retryAfterSeconds advertised on transient /stream acquire failures. */
const RETRY_AFTER_SECONDS = 60;
const DEFAULT_API_BASE_URL = 'https://api.listingapis.com';
const DEFAULT_AUTH_INTERNAL_URL = 'https://auth.marketmaker.cc';

type PollerHandle = { cache(): PollerCache; dispose(): void };

/**
 * Wire the listing module together.
 *
 * Shared, server-keyed data: ListingAPIs client -> REST poller -> caches ->
 * /trends /stats /exchanges /status. Per-user live data: auth-service bridge
 * mints a ListingAPIs key per terminal user -> one upstream SSE stream each ->
 * /stream (downstream SSE) and /listings/recent read the calling user's ring.
 *
 * Failure philosophy: a missing key or secret NEVER crashes start(). The module
 * always comes up; every route answers its own config error while it has
 * nothing to serve, /status always answers 200 so the frontend can show why,
 * and last-good data keeps being served for as long as it exists.
 */
export function buildModule(deps: BuildDeps = {}): { backend: BackendModule; __reset(): void } {
  let poller: PollerHandle | null = null;
  let userStreams: UserStreams | null = null;
  let keyConfigured = false;
  /** Last error surfacing from the poller's refreshes; null again on the next full success. */
  let lastApiFailure: unknown = null;

  /**
   * Map the last poller failure to a route response. Auth/Billing errors carry
   * no status field, so the classes are mapped explicitly; anything else
   * upstream is a generic 502. Returns null when the last refresh succeeded —
   * the caller then serves whatever (possibly empty) data it has.
   */
  function upstreamFailureResponse(set: ErrorStatusSetter): { error: string } | null {
    const err = lastApiFailure;
    if (!err) return null;
    if (err instanceof BillingError) { set.status = 402; return { error: 'MM balance exhausted' }; }
    if (err instanceof AuthError) { set.status = 401; return { error: 'Invalid LISTINGAPIS_API_KEY' }; }
    set.status = 502;
    return { error: 'ListingAPIs unavailable' };
  }

  /** Map a per-user acquire failure to its /stream or /listings/recent response. */
  function acquireFailureResponse(set: ErrorStatusSetter, reason: UserStreamFailReason): { error: string; retryAfterSeconds?: number } {
    switch (reason) {
      case 'no-subscription':
        return errResponse(set, 403, 'listingapis subscription required');
      case 'bridge-unconfigured':
        return errResponse(set, 503, 'terminal auth bridge not configured');
      case 'cap':
        set.status = 503;
        return { error: 'listing streams busy, retry shortly', retryAfterSeconds: RETRY_AFTER_SECONDS };
      case 'auth-unavailable':
        set.status = 503;
        return { error: 'auth service unavailable, retry shortly', retryAfterSeconds: RETRY_AFTER_SECONDS };
      case 'bad-response':
        set.status = 503;
        return { error: 'auth service returned an unexpected response', retryAfterSeconds: RETRY_AFTER_SECONDS };
    }
  }

  const backend: BackendModule = {
    async start(ctx: BackendModuleContext): Promise<BackendModuleHandles> {
      const env = deps.env ?? process.env;
      const apiKey = env.LISTINGAPIS_API_KEY ?? null;
      const baseUrl = env.LISTINGAPIS_API_URL ?? DEFAULT_API_BASE_URL;
      // `|| null`: an empty secret is "not configured", same as an absent one.
      const authSecret = env.AUTH_INTERNAL_SECRET || null;
      const authInternalUrl = env.AUTH_INTERNAL_URL ?? DEFAULT_AUTH_INTERNAL_URL;
      keyConfigured = apiKey !== null;

      if (!apiKey && !authSecret) {
        ctx.log.warn('neither LISTINGAPIS_API_KEY nor AUTH_INTERNAL_SECRET set — module runs inactive: every route answers its own config error');
      } else if (!apiKey) {
        ctx.log.warn('LISTINGAPIS_API_KEY not set — /trends /stats /exchanges answer 503');
      }
      if (!authSecret) {
        ctx.log.warn('AUTH_INTERNAL_SECRET not set — /stream and /listings/recent answer 503 (terminal auth bridge not configured)');
      }

      if (apiKey) {
        poller = startPoller({
          api: createListingApi({ baseUrl, apiKey, fetchImpl: deps.fetchImpl }),
          jobs: guardJobs(ctx),
          storage: ctx.storage,
          // null only when trends+stats+exchanges ALL succeeded; any failure
          // keeps the mapped error (401/402/502) in front of empty routes.
          onSettled: (err) => { lastApiFailure = err; },
        });
      }

      if (authSecret) {
        userStreams = createUserStreams({
          authInternalUrl,
          authInternalSecret: authSecret,
          apiBaseUrl: baseUrl,
          fetchImpl: deps.fetchImpl,
          limit: deps.userStreamsTuning?.limit,
          idleMs: deps.userStreamsTuning?.idleMs,
        });
      }

      const routes = new Elysia()
        .get('/listings/recent', async ({ request, query, set }) => {
          const userId = request.headers.get('x-pm-user-id');
          if (!userId) return errResponse(set, 401, 'user identity required');
          if (!userStreams) return errResponse(set, 503, 'terminal auth bridge not configured');
          const acquired = await userStreams.acquire(userId);
          if (!acquired.ok) return acquireFailureResponse(set, acquired.reason);
          const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100);
          // One-shot read: release the subscriber right away so the entry
          // idles out after its warm window instead of pinning a stream per call.
          try {
            return { listings: acquired.stream.ring.recent(limit) };
          } finally {
            acquired.release();
          }
        })
        .get('/stream', ({ request, set }) => streamDownstream(request, set, userStreams))
        .get('/trends', ({ set }) => {
          if (!keyConfigured) return errResponse(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const cache = poller?.cache();
          if (!cache?.trends) {
            const mapped = upstreamFailureResponse(set);
            if (mapped) return mapped;
          }
          return { trends: cache?.trends ?? null, updatedAt: cache?.updatedAt ?? null };
        })
        .get('/stats', ({ set }) => {
          if (!keyConfigured) return errResponse(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const cache = poller?.cache();
          if (!cache?.stats) {
            const mapped = upstreamFailureResponse(set);
            if (mapped) return mapped;
          }
          return { stats: cache?.stats ?? null, updatedAt: cache?.updatedAt ?? null };
        })
        .get('/exchanges', ({ set }) => {
          if (!keyConfigured) return errResponse(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const cache = poller?.cache();
          if (cache?.exchanges == null) {
            const mapped = upstreamFailureResponse(set);
            if (mapped) return mapped;
          }
          return { exchanges: cache?.exchanges ?? [] };
        })
        .get('/status', () => {
          // Shared-data health only (the global SSE service is gone): the
          // poller's freshness and the last aggregate refresh failure.
          const cache = poller?.cache();
          const status: RouteStatus = !keyConfigured
            ? 'inactive'
            : lastApiFailure !== null
              ? 'reconnecting'
              : cache?.updatedAt != null
                ? 'up'
                : 'connecting';
          return {
            status,
            lastEventAt: cache?.updatedAt ?? null,
            lastError: lastApiFailure instanceof Error ? lastApiFailure.message : lastApiFailure != null ? String(lastApiFailure) : null,
            keyConfigured,
          };
        });

      return { routes };
    },

    async stop() {
      userStreams?.dispose();
      userStreams = null;
      poller?.dispose();
      poller = null;
    },
  };

  function streamDownstream(
    request: Request,
    set: ErrorStatusSetter,
    pool: UserStreams | null,
  ): Promise<Response | { error: string; retryAfterSeconds?: number }> {
    const userId = request.headers.get('x-pm-user-id');
    if (!userId) return Promise.resolve(errResponse(set, 401, 'user identity required'));
    if (!pool) return Promise.resolve(errResponse(set, 503, 'terminal auth bridge not configured'));
    return pool.acquire(userId).then((acquired) => {
      if (!acquired.ok) return acquireFailureResponse(set, acquired.reason);
      return downstreamSse(userId, acquired.stream, acquired.release, request.signal);
    });
  }

  return {
    backend,
    __reset() {
      poller = null;
      userStreams = null;
      keyConfigured = false;
      lastApiFailure = null;
    },
  };
}

/**
 * One downstream SSE connection for one user: a hello frame carrying only the
 * caller identity (never key material), the user's ring replayed as early
 * listing frames (events that landed before this subscribe), then live
 * listing/status relays and a 25s heartbeat comment.
 *
 * Closing is driven from four sides: client abort (request.signal), reader
 * cancel, a stalled client (frame queue overfull — nothing drains it), and the
 * heartbeat tick noticing a silently dead upstream (a 401 key teardown leaves
 * no callback) — the last one sends a terminal {"state":"expired"} status
 * frame first so the client knows to re-acquire. Every close path releases
 * through `release`, which is bound to the entry THIS connection acquired: it
 * can never eat a successor entry's subscriber count after a reconnect.
 */
function downstreamSse(userId: string, stream: UserStream, release: () => void, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let offListing: (() => void) | null = null;
  let offStatus: (() => void) | null = null;
  let closed = false;
  let cleanup: () => void = () => {};

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (frame: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          cleanup(); // reader gone without an abort signal: treat as disconnect
          return;
        }
        // Bound the queue: a client that stopped reading must not pin a
        // per-user upstream stream forever. Overfull means nobody has drained
        // ~64 frames — close hard; the client reconnects with ring backfill.
        if ((controller.desiredSize ?? 1) <= 0) cleanup();
      };
      cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
        offListing?.();
        offStatus?.();
        release();
        try { controller.close(); } catch { /* already closed by cancel() */ }
      };

      send(`event: hello\ndata: ${JSON.stringify({ userId })}\n\n`);
      // Backfill oldest-first (the ring is newest-first): the client sees
      // pre-subscribe events in the same order live ones arrive.
      for (const listing of [...stream.ring.recent()].reverse()) {
        send(`event: listing\ndata: ${JSON.stringify(listing)}\n\n`);
      }
      offListing = stream.onListing((listing) => send(`event: listing\ndata: ${JSON.stringify(listing)}\n\n`));
      offStatus = stream.onStatus((s) => send(`event: status\ndata: ${JSON.stringify({ state: s })}\n\n`));
      heartbeat = setInterval(() => {
        if (!stream.isLive()) {
          send('event: status\ndata: {"state":"expired"}\n\n');
          cleanup();
          return;
        }
        send(': heartbeat\n\n');
      }, HEARTBEAT_MS);
      if (signal.aborted) cleanup();
      else signal.addEventListener('abort', cleanup, { once: true });
    },
    cancel: () => cleanup(),
  }, new CountQueuingStrategy({ highWaterMark: DOWNSTREAM_QUEUE_FRAMES }));

  return new Response(readable, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
  });
}

/**
 * jobs.every adapter: a scheduled tick that throws (or rejects) must never take
 * the host process down — defense in depth on top of the callbacks' own catch,
 * so every fn scheduled through the module is wrapped here and failures only logged.
 */
function guardJobs(ctx: BackendModuleContext): ModuleJobs {
  return {
    every: (ms, fn, name) => ctx.jobs.every(ms, async () => {
      try {
        await fn();
      } catch (err) {
        ctx.log.warn(`job ${name ?? '(unnamed)'} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, name),
    once: (ms, fn) => ctx.jobs.once(ms, fn),
  };
}

/** Elysia's `set.status` also accepts status names, so accept the wider shape. */
interface ErrorStatusSetter {
  status?: number | string | undefined;
}

function errResponse(set: ErrorStatusSetter, status: number, message: string) {
  set.status = status;
  return { error: message };
}

/**
 * Host loader contract (packages/server modules/manager): it imports this entry
 * and requires mod.default.start — exporting the whole buildModule() result
 * (`{backend, __reset}`) would make the module refuse to start. Tests use the
 * named buildModule() export; __reset stays reachable through it.
 */
export default buildModule().backend;
