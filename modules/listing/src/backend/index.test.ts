import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import backendEntry, { buildModule, type BuildDeps } from './index';
import type { FetchLike } from './apiClient';
import { makeStream, sseFrame } from './testStreams';
import type { StatsData, TrendsData } from '../shared/types';

/** In-memory BackendModuleContext (shape from the task brief). */
function makeCtx() {
  const emitted: [string, unknown[]][] = [];
  const storageMap = new Map<string, unknown>();
  const ctx = {
    id: 'listing', version: '0.1.0', routesPrefix: '/api/modules/listing',
    log: { info: () => undefined, warn: () => undefined, error: () => undefined },
    io: {
      emit: (...args: unknown[]) => { emitted.push([args[0] as string, args.slice(1)]); return true; },
      on: () => undefined,
    },
    jobs: { every: () => ({ dispose: () => undefined }), once: () => ({ dispose: () => undefined }) },
    storage: {
      get: async <T,>(k: string) => (storageMap.get(k) as T) ?? null,
      set: async (k: string, v: unknown) => { storageMap.set(k, v); },
      delete: async (k: string) => { storageMap.delete(k); },
      all: async () => Object.fromEntries(storageMap),
    },
    ccxt: { getInstance: async () => { throw new Error('not used'); } },
    providers: { register: () => ({ dispose: () => undefined }), unregister: () => false },
    env: { dataDir: '/tmp' },
  } as never;
  return { ctx, emitted, storageMap };
}

const TRENDS: TrendsData = {
  trending_tickers: { last_7_days: [], last_30_days: [] },
  trending_exchanges: { last_7_days: [], last_30_days: [] },
  metadata: { last_updated: '2026-08-23T00:00:00Z' },
};

const activityPeriod = { new_listings: 3, new_pairs: 5, active_exchanges: 7, top_exchange: 'binance', top_exchange_listings: 12 };

const STATS: StatsData = {
  global_stats: { total_tickers: 400, total_exchanges: 90, total_pairs: 9_000, total_listings: 40_000, last_updated: '2026-08-23T00:00:00Z' },
  activity_stats: { last_24_hours: activityPeriod, last_7_days: activityPeriod, last_30_days: activityPeriod },
  pair_stats: { most_common_quote_currencies: [{ quote: 'USDT', count: 2_500 }] },
};

/** Upstream REST listing (snake_case, oldest -> newest). */
const restListing = (id: number) => ({
  id, exchange_name: 'binance', ticker_symbol: `SYM${id}`, ticker_full_name: `Sym ${id}`,
  type: 'Listing', title: `listing ${id}`,
  pairs: [{ pair: `SYM${id}/USDT`, url: `https://binance.com/${id}` }],
  listing_date: `2026-08-20T00:0${id}:00Z`, created_at: `2026-08-20T00:0${id}:01Z`,
});

/** Upstream SSE listing-event payload. */
const streamPayload = (id: number) => ({ id, exchange: 'binance', symbol: `SYM${id}`, type: 'listing', title: `listing ${id}` });

interface FakeUpstreamOptions {
  listings?: ReturnType<typeof restListing>[];
  stream?: string[];
  trends?: TrendsData;
  stats?: StatsData;
  exchanges?: string[];
  /** Non-200 status for every REST call (SSE stream excluded). */
  restStatus?: number;
  /** Non-200 status for the SSE stream endpoint. */
  streamStatus?: number;
  /** Non-200 status for the stats endpoint only (partial outage). */
  statsStatus?: number;
}

/** fetchImpl fake routing by URL: SSE stream, listings, trends, stats, exchanges. */
function makeFetchImpl(opts: FakeUpstreamOptions = {}) {
  return vi.fn<FetchLike>(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (url.includes('/api/public/stream')) {
      if (opts.streamStatus && opts.streamStatus !== 200) return new Response(null, { status: opts.streamStatus });
      return new Response(makeStream(opts.stream ?? [sseFrame('hello', { ok: true })]), { status: 200 });
    }
    if (url.includes('/stats') && opts.statsStatus && opts.statsStatus !== 200) return new Response(null, { status: opts.statsStatus });
    if (opts.restStatus && opts.restStatus !== 200) return new Response(null, { status: opts.restStatus });
    if (url.includes('/listings')) return Response.json({ listings: opts.listings ?? [] });
    if (url.includes('/trends')) return Response.json(opts.trends ?? TRENDS);
    if (url.includes('/stats')) return Response.json(opts.stats ?? STATS);
    if (url.includes('/exchanges')) return Response.json({ exchanges: (opts.exchanges ?? ['binance', 'bybit']).map((slug) => ({ slug })) });
    return new Response(null, { status: 404 });
  });
}

let cleanup: (() => Promise<void>) | null = null;

/**
 * Build the module, start it against a fake ctx, and return its mounted-routes
 * dispatcher. Requests go through routes.handle() directly — exactly how the
 * terminal host dispatches after stripping the /api/modules/listing prefix.
 */
async function startApp(deps: BuildDeps) {
  const made = makeCtx();
  const mod = buildModule(deps);
  const handles = await mod.backend.start(made.ctx);
  const routes = handles?.routes;
  expect(routes).toBeDefined();
  // Elysia registers routes asynchronously: settle before dispatching (host does the same).
  await (routes as unknown as { modules?: Promise<unknown> }).modules;
  cleanup = async () => { await mod.backend.stop?.(); mod.__reset(); };
  return { routes: routes!, ...made };
}

/** Dispatch one GET through the module routes. */
const get = (routes: { handle(request: Request): Response | Promise<Response> }, path: string) =>
  routes.handle(new Request(`http://localhost${path}`));

describe('listing backend module', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
    vi.useRealTimers();
  });

  it('default export is a startable backend module (host loader contract)', () => {
    // packages/server modules/manager imports the built entry and requires
    // mod.default.start — anything else throws "backend entry ... has no
    // start() export" and the module never starts in the terminal.
    expect(backendEntry).toBeDefined();
    expect(typeof backendEntry.start).toBe('function');
  });

  it('serves 503 on every data route without a key, but /status stays 200 inactive', async () => {
    const { routes } = await startApp({ env: {}, fetchImpl: makeFetchImpl() });
    for (const path of ['/listings/recent', '/trends', '/stats', '/exchanges']) {
      const res = await get(routes, path);
      expect(res.status, path).toBe(503);
      expect(await res.json()).toEqual({ error: 'LISTINGAPIS_API_KEY is not configured' });
    }
    const res = await get(routes, '/status');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'inactive', lastEventAt: null, lastError: null, keyConfigured: false });
  });

  it('serves backfilled + live listings newest-first and pushes them over the socket', async () => {
    const fetchImpl = makeFetchImpl({
      listings: [restListing(1), restListing(2), restListing(3)], // backfill order: oldest -> newest
      stream: [sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(100))],
    });
    const { routes, emitted } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl });
    await vi.advanceTimersByTimeAsync(0); // SSE connect consumes the buffered frames

    const res = await get(routes, '/listings/recent');
    expect(res.status).toBe(200);
    const body = await res.json();
    // ring is newest-first: live SSE listing on top, then backfill newest -> oldest
    expect(body.listings.map((l: { id: number }) => l.id)).toEqual([100, 3, 2, 1]);
    expect(body.listings[0]).toMatchObject({ id: 100, exchange: 'binance', symbol: 'SYM100', type: 'listing', url: null });

    // limit is clamped into 1..100 and slices from the newest end
    const limited = await (await get(routes, '/listings/recent?limit=2')).json();
    expect(limited.listings.map((l: { id: number }) => l.id)).toEqual([100, 3]);
    const zero = await (await get(routes, '/listings/recent?limit=0')).json(); // invalid -> default 50
    expect(zero.listings).toHaveLength(4);

    // socket wiring: status transitions and new listings are emitted on /m/listing
    expect(emitted).toEqual([
      ['status', ['up']],
      ['listing', [expect.objectContaining({ id: 100 })]],
    ]);
  });

  it('serves cached trends/stats/exchanges from the poller', async () => {
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: makeFetchImpl() });
    await vi.advanceTimersByTimeAsync(0); // poller kickoff refresh settles

    const trends = await (await get(routes, '/trends')).json();
    expect(trends).toEqual({ trends: TRENDS, updatedAt: expect.any(Number) });
    const stats = await (await get(routes, '/stats')).json();
    expect(stats).toEqual({ stats: STATS, updatedAt: expect.any(Number) });
    const exchanges = await (await get(routes, '/exchanges')).json();
    expect(exchanges).toEqual({ exchanges: ['binance', 'bybit'] });

    const status = await (await get(routes, '/status')).json();
    // default fake stream carries only a hello frame: up, but no listing event yet
    expect(status).toEqual({ status: 'up', lastEventAt: null, lastError: null, keyConfigured: true });
  });

  it.each([
    { restStatus: 402, streamStatus: 402, code: 402, error: 'MM balance exhausted' },
    { restStatus: 401, streamStatus: 401, code: 401, error: 'Invalid LISTINGAPIS_API_KEY' },
    { restStatus: 503, streamStatus: 503, code: 502, error: 'ListingAPIs unavailable' },
  ])('maps upstream $restStatus on data routes to $code when there is no data to serve', async ({ restStatus, streamStatus, code, error }) => {
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: makeFetchImpl({ restStatus, streamStatus }) });
    await vi.advanceTimersByTimeAsync(0); // failed backfill + poller refresh settle

    for (const path of ['/listings/recent', '/trends', '/stats', '/exchanges']) {
      const res = await get(routes, path);
      expect(res.status, `${path} -> ${code}`).toBe(code);
      expect(await res.json()).toEqual({ error });
    }
    // /status stays 200 and still reports the key as configured
    const res = await get(routes, '/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keyConfigured).toBe(true);
    expect(body.lastError).toContain(String(streamStatus));
  });

  it('serves 200 with partial data when only one poller endpoint fails', async () => {
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: makeFetchImpl({ statsStatus: 402 }) });
    await vi.advanceTimersByTimeAsync(0); // poller refresh settles: trends+exchanges cached, stats failed

    // successful endpoints keep serving fresh data with 200
    const trends = await get(routes, '/trends');
    expect(trends.status).toBe(200);
    expect(await trends.json()).toEqual({ trends: TRENDS, updatedAt: expect.any(Number) });
    const exchanges = await (await get(routes, '/exchanges')).json();
    expect(exchanges).toEqual({ exchanges: ['binance', 'bybit'] });

    // the failed slot has nothing to serve: the mapped upstream error, not 200 null
    const stats = await get(routes, '/stats');
    expect(stats.status).toBe(402);
    expect(await stats.json()).toEqual({ error: 'MM balance exhausted' });
  });
});
