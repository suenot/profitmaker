import { Elysia } from 'elysia';
import type { BackendModule, BackendModuleContext, BackendModuleHandles, ModuleJobs } from '@profitmaker/module-sdk';
import type { RouteStatus } from '../shared/types';
import { AuthError, BillingError, createListingApi, type FetchLike, type ListingApi } from './apiClient';
import { createListingRing, type ListingRing } from './ringBuffer';
import { createSseService, type SseService } from './sse';
import { startPoller, type PollerCache } from './poller';

/** DI seam for tests: inject a fake fetch and/or env without touching process.env. */
export interface BuildDeps {
  fetchImpl?: FetchLike;
  env?: Record<string, string | undefined>;
}

type PollerHandle = { cache(): PollerCache; dispose(): void };

/**
 * Wire the listing module together: ListingAPIs client -> SSE stream + REST
 * poller -> ring buffer + caches -> Elysia routes and /m/listing socket events.
 *
 * Failure philosophy: a missing or rejected key NEVER crashes start(). The
 * module always comes up; data routes answer 503 (no key) or a mapped upstream
 * error (401/402/502) while they have nothing to serve, /status always answers
 * 200 so the frontend can show why, and last-good data keeps being served for
 * as long as it exists.
 */
export function buildModule(deps: BuildDeps = {}): { backend: BackendModule; __reset(): void } {
  let sse: SseService | null = null;
  let poller: PollerHandle | null = null;
  let ring: ListingRing = createListingRing();
  let keyConfigured = false;
  /** Last error surfacing from the tracked API client; null again on the next success. */
  let lastApiFailure: unknown = null;

  /** Track success/failure of every API call so routes can map upstream errors. */
  function tracked<T>(op: () => Promise<T>): Promise<T> {
    return op().then(
      (value) => { lastApiFailure = null; return value; },
      (err) => { lastApiFailure = err; throw err; },
    );
  }

  /**
   * Map the last API failure to a route response. Auth/Billing errors carry no
   * status field, so the classes are mapped explicitly; anything else upstream
   * is a generic 502. Returns null when the last call succeeded — the caller
   * then serves whatever (possibly empty) data it has.
   */
  function upstreamFailureResponse(set: ErrorStatusSetter): { error: string } | null {
    const err = lastApiFailure;
    if (!err) return null;
    if (err instanceof BillingError) { set.status = 402; return { error: 'MM balance exhausted' }; }
    if (err instanceof AuthError) { set.status = 401; return { error: 'Invalid LISTINGAPIS_API_KEY' }; }
    set.status = 502;
    return { error: 'ListingAPIs unavailable' };
  }

  const backend: BackendModule = {
    async start(ctx: BackendModuleContext): Promise<BackendModuleHandles> {
      const env = deps.env ?? process.env;
      const apiKey = env.LISTINGAPIS_API_KEY ?? null;
      const baseUrl = env.LISTINGAPIS_API_URL ?? 'https://api.listingapis.com';
      keyConfigured = apiKey !== null;

      if (!apiKey) {
        ctx.log.warn('LISTINGAPIS_API_KEY not set — module runs inactive: data routes return 503, /status reports keyConfigured=false');
      } else {
        const rawApi = createListingApi({ baseUrl, apiKey, fetchImpl: deps.fetchImpl });
        // Only getListings is per-call tracked (its backfill/poll outcome maps
        // directly to /listings/recent errors). The poller's three endpoints are
        // reported as an aggregate through onSettled — per-call tracking would
        // let a later-settling success clear a sibling endpoint's failure.
        const api: ListingApi = {
          ...rawApi,
          getListings: (limit) => tracked(() => rawApi.getListings(limit)),
        };

        ring = createListingRing(100);
        sse = createSseService({
          baseUrl, apiKey, api, ring,
          fetchImpl: deps.fetchImpl,
          onListing: (listing) => ctx.io.emit('listing', listing),
          onStatus: (status) => ctx.io.emit('status', status),
        });
        poller = startPoller({
          api: rawApi,   // untracked: the aggregate outcome flows through onSettled
          jobs: guardJobs(ctx),
          storage: ctx.storage,
          // null only when trends+stats+exchanges ALL succeeded; any failure
          // keeps the mapped error (401/402/502) in front of empty routes.
          onSettled: (err) => { lastApiFailure = err; },
        });

        try {
          await sse.backfill(100);
        } catch (err) {
          // Bad key / exhausted balance must not crash module start: routes
          // keep serving last-good data (or the mapped error) and /status reports it.
          ctx.log.warn(`listing backfill failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        sse.start();
      }

      const routes = new Elysia()
        .get('/listings/recent', ({ query, set }) => {
          if (!keyConfigured) return errResponse(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100);
          const listings = ring.recent(limit);
          if (listings.length === 0) {
            const mapped = upstreamFailureResponse(set);
            if (mapped) return mapped;
          }
          return { listings };
        })
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
          const s = sse?.getStatus();
          return {
            status: (s?.status ?? 'inactive') as RouteStatus,
            lastEventAt: s?.lastEventAt ?? null,
            lastError: s?.lastError ?? null,
            keyConfigured,
          };
        });

      return { routes };
    },

    async stop() {
      sse?.stop();
      poller?.dispose();
    },
  };

  return {
    backend,
    __reset() {
      sse = null;
      poller = null;
      ring = createListingRing();
      keyConfigured = false;
      lastApiFailure = null;
    },
  };
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
