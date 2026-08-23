import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import backendEntry, { buildModule, type BuildDeps } from './index';
import type { FetchLike } from './apiClient';
import { makeHeartbeatStream, makeStream, sseFrame } from './testStreams';
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

/** Upstream SSE listing-event payload. */
const streamPayload = (id: number) => ({ id, exchange: 'binance', symbol: `SYM${id}`, type: 'listing', title: `listing ${id}` });

const AUTH_URL = 'https://auth.test';
const HOUR_MS = 60 * 60 * 1000;

/** Env with the auth bridge on: /stream and /listings/recent serve per-user data. */
const BRIDGE_ENV: Record<string, string> = {
  LISTINGAPIS_API_KEY: 'server-key',
  AUTH_INTERNAL_SECRET: 'bridge-secret',
  AUTH_INTERNAL_URL: AUTH_URL,
};

interface FakeUpstreamOptions {
  trends?: TrendsData;
  stats?: StatsData;
  exchanges?: string[];
  /** Non-200 status for every REST call. */
  restStatus?: number;
  /** Non-200 status for the stats endpoint only (partial outage). */
  statsStatus?: number;
  /** Auth-service key-mint responder; default mints sk_1, sk_2, ... for 168h. */
  issue?: () => Response;
  /** Upstream stream body keyed on the connect's Authorization header. */
  userStream?: (auth: string) => Response | Promise<Response>;
}

/**
 * fetchImpl fake routing by URL: auth-service mint, upstream SSE stream,
 * trends, stats, exchanges. Records every stream connect's Authorization.
 */
function makeFetchImpl(opts: FakeUpstreamOptions = {}) {
  let mints = 0;
  const streamAuths: string[] = [];
  const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (url.startsWith(AUTH_URL)) {
      if (opts.issue) return opts.issue();
      mints += 1;
      return Response.json({ key: `sk_${mints}`, expires_at: new Date(Date.now() + 168 * HOUR_MS).toISOString() }, { status: 201 });
    }
    if (url.includes('/api/public/stream')) {
      const auth = ((init?.headers as Record<string, string>) ?? {}).Authorization;
      streamAuths.push(auth);
      return opts.userStream ? opts.userStream(auth) : new Response(makeStream([sseFrame('hello', { ok: true })]), { status: 200 });
    }
    if (url.includes('/stats') && opts.statsStatus && opts.statsStatus !== 200) return new Response(null, { status: opts.statsStatus });
    if (opts.restStatus && opts.restStatus !== 200) return new Response(null, { status: opts.restStatus });
    if (url.includes('/trends')) return Response.json(opts.trends ?? TRENDS);
    if (url.includes('/stats')) return Response.json(opts.stats ?? STATS);
    if (url.includes('/exchanges')) return Response.json({ exchanges: (opts.exchanges ?? ['binance', 'bybit']).map((slug) => ({ slug })) });
    return new Response(null, { status: 404 });
  });
  return { fetchImpl, streamAuths };
}

/**
 * A 200 stream whose chunks only enqueue at `delayMs` on the (fake) clock, so
 * events land after /stream has subscribed its relays, deterministically.
 */
function delayedStream(delayMs: number, chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      setTimeout(() => {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      }, delayMs);
    },
  }), { status: 200 });
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

type Dispatcher = { handle(request: Request): Response | Promise<Response> };

/** Dispatch one GET through the module routes. */
const get = (routes: Dispatcher, path: string, init?: RequestInit) =>
  routes.handle(new Request(`http://localhost${path}`, init));

/** Dispatch one GET as a named terminal user (host-minted identity header). */
const asUser = (routes: Dispatcher, path: string, userId = 'user-1', signal?: AbortSignal) =>
  get(routes, path, { headers: { 'x-pm-user-id': userId }, signal });

/**
 * Collect downstream SSE frames from a /stream response in the background.
 * Returns the (mutating) frame list; frames are blank-line-terminated chunks.
 */
function collectFrames(res: Response): string[] {
  const frames: string[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  void (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          frames.push(buf.slice(0, idx));
          buf = buf.slice(idx + 2);
        }
      }
    } catch { /* closed under us during teardown */ }
  })();
  return frames;
}

/** Parse one collected frame into its event name and JSON data. */
function parseFrame(frame: string): { event: string; data: unknown } {
  const event = /^event: (.*)$/m.exec(frame)?.[1] ?? '';
  const raw = /^data: (.*)$/m.exec(frame)?.[1] ?? 'null';
  return { event, data: JSON.parse(raw) };
}

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

  it('boots with no key and no bridge: every route answers its own config error', async () => {
    const { fetchImpl } = makeFetchImpl();
    const { routes } = await startApp({ env: {}, fetchImpl: fetchImpl as unknown as FetchLike });

    // shared data routes: no server key
    for (const path of ['/trends', '/stats', '/exchanges']) {
      const res = await get(routes, path);
      expect(res.status, path).toBe(503);
      expect(await res.json()).toEqual({ error: 'LISTINGAPIS_API_KEY is not configured' });
    }
    // per-user routes: identity first, then bridge config
    expect(await (await get(routes, '/stream')).json()).toEqual({ error: 'user identity required' });
    expect(await (await get(routes, '/stream')).status).toBe(401);
    expect(await (await asUser(routes, '/stream')).status).toBe(503);
    expect(await (await asUser(routes, '/stream')).json()).toEqual({ error: 'terminal auth bridge not configured' });
    expect(await (await asUser(routes, '/listings/recent')).status).toBe(503);
    expect(await (await asUser(routes, '/listings/recent')).json()).toEqual({ error: 'terminal auth bridge not configured' });
    expect(await (await get(routes, '/listings/recent')).status).toBe(401);

    // /status stays 200 inactive; nothing was fetched from anywhere
    const res = await get(routes, '/status');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'inactive', lastEventAt: null, lastError: null, keyConfigured: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('without a bridge secret there is no global stream: poller endpoints only, no socket events', async () => {
    const { fetchImpl } = makeFetchImpl();
    const { routes, emitted } = await startApp({ env: { LISTINGAPIS_API_KEY: 'server-key' }, fetchImpl: fetchImpl });

    await vi.advanceTimersByTimeAsync(0); // poller kickoff refresh settles
    const trends = await (await get(routes, '/trends')).json();
    expect(trends).toEqual({ trends: TRENDS, updatedAt: expect.any(Number) });

    // the global SSE service and its REST backfill are gone from boot: the
    // only upstream calls are the poller's three endpoints, keyed server-side.
    await vi.advanceTimersByTimeAsync(120_000);
    const urls = (fetchImpl.mock.calls as unknown as [string][]).map(([input]) => String(input));
    expect(urls.some((u) => u.includes('/api/public/stream'))).toBe(false);
    expect(urls.some((u) => u.includes('/listings'))).toBe(false);
    expect(urls.every((u) => u.includes('/trends') || u.includes('/stats') || u.includes('/exchanges'))).toBe(true);
    expect(emitted).toEqual([]); // no socket listing/status pushes anymore
  });

  describe('/stream', () => {
    it('401 without the host identity header, before any per-user upstream call', async () => {
      const { fetchImpl } = makeFetchImpl();
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await get(routes, '/stream');
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'user identity required' });
      // the poller's server-keyed calls may have happened; nothing per-user did
      const urls = (fetchImpl.mock.calls as unknown as [string][]).map(([input]) => String(input));
      expect(urls.some((u) => u.startsWith(AUTH_URL))).toBe(false);
      expect(urls.some((u) => u.includes('/api/public/stream'))).toBe(false);
    });

    it('503 when the terminal auth bridge is not configured', async () => {
      const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'server-key' }, fetchImpl: makeFetchImpl().fetchImpl });
      const res = await asUser(routes, '/stream');
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'terminal auth bridge not configured' });
    });

    it.each([
      { issue: () => new Response('{"error":"no plan"}', { status: 403 }), status: 403, body: { error: 'listingapis subscription required' } },
      { issue: () => new Response('{"error":"overload"}', { status: 429 }), status: 503, body: { error: 'listing streams busy, retry shortly', retryAfterSeconds: 60 } },
      { issue: () => new Response('error', { status: 503 }), status: 503, body: { error: 'auth service unavailable, retry shortly', retryAfterSeconds: 60 } },
      { issue: () => Response.json({ unexpected: true }), status: 503, body: { error: 'auth service returned an unexpected response', retryAfterSeconds: 60 } },
    ])('maps mint failure to $status $body.error', async ({ issue, status, body }) => {
      const { fetchImpl } = makeFetchImpl({ issue });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await asUser(routes, '/stream');
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual(body);
    });

    it('caps simultaneous per-user streams: 503 busy with retry hint, no mint for the rejected user', async () => {
      const { fetchImpl, streamAuths } = makeFetchImpl();
      const { routes } = await startApp({
        env: BRIDGE_ENV,
        fetchImpl: fetchImpl,
        userStreamsTuning: { limit: 1 },
      });
      const first = await asUser(routes, '/stream', 'user-1');
      expect(first.status).toBe(200);
      first.body?.cancel().catch(() => {});

      const second = await asUser(routes, '/stream', 'user-2');
      expect(second.status).toBe(503);
      expect(await second.json()).toEqual({ error: 'listing streams busy, retry shortly', retryAfterSeconds: 60 });
      expect(streamAuths).toEqual(['Bearer sk_1']); // user-2 never connected
    });

    it('streams hello (identity only) and the ring as early backfill listing frames', async () => {
      const { fetchImpl, streamAuths } = makeFetchImpl({
        // listing(7) is buffered on the connect: it lands in the ring while the
        // first subscriber is attached, then stays there for the next one.
        userStream: () => new Response(makeStream([sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(7))]), { status: 200 }),
      });
      const { routes, emitted } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });

      // warm the user's stream: one connection consumes the buffered listing
      const warm = await asUser(routes, '/stream');
      const warmFrames = collectFrames(warm);
      await vi.advanceTimersByTimeAsync(1_000); // settle the connect's read chain
      expect(warmFrames.length).toBeGreaterThanOrEqual(2); // hello + live relay of 7
      warm.body?.cancel().catch(() => {});
      expect(streamAuths).toEqual(['Bearer sk_1']); // per-user minted key, not the server key
      expect(emitted).toEqual([]); // nothing is pushed over the socket anymore

      // the next subscriber gets hello first, then 7 replayed from the ring —
      // before any of its own live events (the upstream is quiet by now)
      const res = await asUser(routes, '/stream');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/event-stream');
      expect(res.headers.get('cache-control')).toBe('no-store');
      const frames = collectFrames(res);
      await vi.advanceTimersByTimeAsync(0);

      // first frame is exactly hello with the caller identity — never key material
      expect(frames[0]).toBe('event: hello\ndata: {"userId":"user-1"}');
      // the pre-subscribe event is served as an early listing frame
      expect(frames[1]?.startsWith('event: listing\ndata: ')).toBe(true);
      expect(parseFrame(frames[1]).data).toMatchObject({ id: 7, exchange: 'binance', symbol: 'SYM7' });
      expect(streamAuths).toEqual(['Bearer sk_1']); // the warm entry was reused, no re-mint
      res.body?.cancel().catch(() => {});
    });

    it('relays live listing and status events that arrive after subscribe', async () => {
      const { fetchImpl } = makeFetchImpl({
        userStream: () => delayedStream(1_000, [sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(100))]),
      });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await asUser(routes, '/stream');
      const frames = collectFrames(res);
      await vi.advanceTimersByTimeAsync(0);
      expect(frames).toHaveLength(1); // hello only: upstream is quiet until t=1s

      await vi.advanceTimersByTimeAsync(1_000);
      // first traffic marks the upstream 'up' (relayed), then the listing itself
      expect(frames.map((f) => parseFrame(f))).toEqual([
        { event: 'hello', data: { userId: 'user-1' } },
        { event: 'status', data: { state: 'up' } },
        { event: 'listing', data: expect.objectContaining({ id: 100, symbol: 'SYM100' }) },
      ]);
      res.body?.cancel().catch(() => {});
    });

    it('emits a heartbeat comment every 25s', async () => {
      // upstream pings every 20s keep the per-user stream's own watchdog fed,
      // so the only scheduled output downstream is OUR heartbeat cadence
      const { fetchImpl } = makeFetchImpl({
        userStream: () => new Response(makeHeartbeatStream(20_000, 4), { status: 200 }),
      });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await asUser(routes, '/stream');
      const frames = collectFrames(res);

      await vi.advanceTimersByTimeAsync(24_999);
      expect(frames).toHaveLength(1); // hello only, no heartbeat yet
      await vi.advanceTimersByTimeAsync(1);
      expect(frames).toEqual(['event: hello\ndata: {"userId":"user-1"}', ': heartbeat']);
      await vi.advanceTimersByTimeAsync(25_000);
      expect(frames[2]).toBe(': heartbeat');
      res.body?.cancel().catch(() => {});
    });

    it('on abort: releases the subscriber, clears the heartbeat, lets the entry idle out; reconnect re-acquires', async () => {
      const { fetchImpl, streamAuths } = makeFetchImpl();
      const { routes } = await startApp({
        env: BRIDGE_ENV,
        fetchImpl: fetchImpl,
        userStreamsTuning: { idleMs: 5_000 },
      });
      const abort = new AbortController();
      const res = await asUser(routes, '/stream', 'user-1', abort.signal);
      const frames = collectFrames(res);
      await vi.advanceTimersByTimeAsync(0);
      expect(frames).toHaveLength(1);

      abort.abort(); // client disconnects
      await vi.advanceTimersByTimeAsync(6_000); // idle window passes -> entry torn down
      // heartbeat interval cleared at abort, upstream watchdog cleared at teardown
      expect(vi.getTimerCount()).toBe(0);

      // subscriberRemoved really ran (teardown only happens from zero
      // subscribers): a reconnect acquires fresh and streams hello again.
      const again = await asUser(routes, '/stream');
      expect(again.status).toBe(200);
      const frames2 = collectFrames(again);
      await vi.advanceTimersByTimeAsync(0);
      expect(frames2[0]).toBe('event: hello\ndata: {"userId":"user-1"}');
      expect(streamAuths).toEqual(['Bearer sk_1', 'Bearer sk_1']); // cached key reused on re-mint path
      again.body?.cancel().catch(() => {});
    });

    it('closes with {"state":"expired"} when the upstream key dies (silent 401 teardown)', async () => {
      const { fetchImpl } = makeFetchImpl({ userStream: () => new Response(null, { status: 401 }) });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await asUser(routes, '/stream');
      expect(res.status).toBe(200); // acquire succeeded; the 401 lands async
      const frames = collectFrames(res);
      await vi.advanceTimersByTimeAsync(0); // connect gets the 401, entry torn down silently

      await vi.advanceTimersByTimeAsync(25_000); // next heartbeat tick notices the dead entry
      expect(frames).toEqual([
        'event: hello\ndata: {"userId":"user-1"}',
        'event: status\ndata: {"state":"expired"}',
      ]);
      // the stream closed: one expired frame, then EOF, and no timer is left running
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('a stale connection releases only its own entry, never a successor (regression)', async () => {
      // E1 (shared by connections A and B) dies via upstream 401; B reconnects
      // first and lands on a fresh E2; A's late cleanup must not release E2's
      // hold — otherwise E2 idles out under the live B and its ring is lost.
      const { fetchImpl, streamAuths } = makeFetchImpl({
        // sk_1's connect answers 401 only after a delay, so BOTH connections
        // land on E1 before it dies (an instant 401 would tear E1 down in the
        // same microtask window, before the second acquire can share it).
        userStream: async (auth) => {
          if (auth === 'Bearer sk_1') {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return new Response(null, { status: 401 });
          }
          return new Response(makeStream([sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(42))]), { status: 200 });
        },
      });
      const { routes } = await startApp({
        env: BRIDGE_ENV,
        fetchImpl: fetchImpl,
        userStreamsTuning: { idleMs: 5_000 },
      });

      const abortA = new AbortController();
      const a = await asUser(routes, '/stream', 'user-1', abortA.signal); // A acquires E1
      const framesA = collectFrames(a);
      const b = await asUser(routes, '/stream'); // B shares E1
      collectFrames(b);
      await vi.advanceTimersByTimeAsync(1_000); // E1's connect 401s: silent teardown

      const b2 = await asUser(routes, '/stream'); // B reconnects first: fresh E2
      const framesB2 = collectFrames(b2);
      await vi.advanceTimersByTimeAsync(1_000); // E2's buffered listing lands in its ring
      expect(streamAuths).toEqual(['Bearer sk_1', 'Bearer sk_2']);

      abortA.abort(); // A's cleanup fires now, after E2 exists
      await vi.advanceTimersByTimeAsync(6_000); // idle window passes

      // E2 survived A's stale release: it is still the live entry, so the
      // re-read hits its pre-warmed ring (a torn-down E2 would answer []).
      const recent = await (await asUser(routes, '/listings/recent')).json();
      expect(recent.listings.map((l: { id: number }) => l.id)).toEqual([42]);
      // B2's connection never saw the entry expire underneath it
      expect(framesB2.some((f) => f.includes('"expired"'))).toBe(false);
      expect(framesA[0]).toBe('event: hello\ndata: {"userId":"user-1"}');
      a.body?.cancel().catch(() => {});
      b2.body?.cancel().catch(() => {});
    });

    it('force-closes a stalled downstream when its frame queue overflows, releasing the subscriber', async () => {
      // 70 listings land at once while the client never reads: the bounded
      // queue must trip, close the connection, and release the subscriber.
      const many = Array.from({ length: 70 }, (_, i) => sseFrame('listing', streamPayload(i + 1)));
      const { fetchImpl, streamAuths } = makeFetchImpl({
        userStream: () => delayedStream(1_000, [sseFrame('hello', { ok: true }), ...many]),
      });
      const { routes } = await startApp({
        env: BRIDGE_ENV,
        fetchImpl: fetchImpl,
        userStreamsTuning: { idleMs: 5_000 },
      });

      const res = await asUser(routes, '/stream');
      // deliberately no reader: nothing drains the downstream queue
      await vi.advanceTimersByTimeAsync(1_100); // all 70 listings relay: overflow trips

      // the connection was closed: a late reader drains the backlog, then EOF
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let done = false;
      for (let guard = 0; !done && guard < 200; guard++) {
        const chunk = await reader.read();
        done = chunk.done ?? false;
        if (chunk.value) text += decoder.decode(chunk.value, { stream: true });
      }
      expect(done).toBe(true);
      const listingFrames = (text.match(/event: listing/g) ?? []).length;
      expect(listingFrames).toBeLessThanOrEqual(64); // bounded, not the full 70
      expect(listingFrames).toBeGreaterThanOrEqual(60);

      // the subscriber was released: the entry idles out and a reconnect dials fresh
      await vi.advanceTimersByTimeAsync(6_000);
      const again = await asUser(routes, '/stream');
      expect(again.status).toBe(200);
      expect(streamAuths).toEqual(['Bearer sk_1', 'Bearer sk_1']); // cached key, new connect
      again.body?.cancel().catch(() => {});
    });
  });

  describe('/listings/recent', () => {
    it('401 without the host identity header; 503 without the bridge', async () => {
      const { fetchImpl } = makeFetchImpl();
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const noIdentity = await get(routes, '/listings/recent');
      expect(noIdentity.status).toBe(401);
      expect(await noIdentity.json()).toEqual({ error: 'user identity required' });

      const { routes: bareRoutes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'server-key' }, fetchImpl: makeFetchImpl().fetchImpl });
      const noBridge = await asUser(bareRoutes, '/listings/recent');
      expect(noBridge.status).toBe(503);
      expect(await noBridge.json()).toEqual({ error: 'terminal auth bridge not configured' });
    });

    it('serves the calling user\'s ring, newest-first, with the limit clamp', async () => {
      const { fetchImpl } = makeFetchImpl({
        userStream: (auth) => (auth === 'Bearer sk_1'
          ? new Response(makeStream([sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(5)), sseFrame('listing', streamPayload(6))]), { status: 200 })
          : new Response(makeStream([sseFrame('hello', { ok: true }), sseFrame('listing', streamPayload(9))]), { status: 200 })),
      });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });

      // warm user-1's stream: the GET mints sk_1, connects, buffered frames land
      const warm = await asUser(routes, '/stream');
      collectFrames(warm); // drain so the connect's frames are consumed
      await vi.advanceTimersByTimeAsync(1_000);
      warm.body?.cancel().catch(() => {});

      const res = await asUser(routes, '/listings/recent');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.listings.map((l: { id: number }) => l.id)).toEqual([6, 5]);
      expect(body.listings[0]).toMatchObject({ id: 6, exchange: 'binance', symbol: 'SYM6', type: 'listing', url: null });

      const limited = await (await asUser(routes, '/listings/recent?limit=1')).json();
      expect(limited.listings.map((l: { id: number }) => l.id)).toEqual([6]);
      const invalid = await (await asUser(routes, '/listings/recent?limit=0')).json(); // invalid -> default 50
      expect(invalid.listings).toHaveLength(2);

      // rings are per user: user-2's stream carries its own events only
      const warm2 = await asUser(routes, '/stream', 'user-2');
      collectFrames(warm2);
      await vi.advanceTimersByTimeAsync(1_000);
      warm2.body?.cancel().catch(() => {});
      const other = await (await asUser(routes, '/listings/recent', 'user-2')).json();
      expect(other.listings.map((l: { id: number }) => l.id)).toEqual([9]);
    });

    it('maps mint failures like /stream does', async () => {
      const { fetchImpl } = makeFetchImpl({ issue: () => new Response('{"error":"no plan"}', { status: 403 }) });
      const { routes } = await startApp({ env: BRIDGE_ENV, fetchImpl: fetchImpl });
      const res = await asUser(routes, '/listings/recent');
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'listingapis subscription required' });
    });
  });

  it('serves cached trends/stats/exchanges from the poller; /status reports poller health', async () => {
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: makeFetchImpl().fetchImpl });
    await vi.advanceTimersByTimeAsync(0); // poller kickoff refresh settles

    const trends = await (await get(routes, '/trends')).json();
    expect(trends).toEqual({ trends: TRENDS, updatedAt: expect.any(Number) });
    const stats = await (await get(routes, '/stats')).json();
    expect(stats).toEqual({ stats: STATS, updatedAt: expect.any(Number) });
    const exchanges = await (await get(routes, '/exchanges')).json();
    expect(exchanges).toEqual({ exchanges: ['binance', 'bybit'] });

    const status = await (await get(routes, '/status')).json();
    expect(status).toEqual({ status: 'up', lastEventAt: expect.any(Number), lastError: null, keyConfigured: true });
  });

  it.each([
    { restStatus: 402, code: 402, error: 'MM balance exhausted', lastError: 'MM balance exhausted' },
    { restStatus: 401, code: 401, error: 'Invalid LISTINGAPIS_API_KEY', lastError: 'Invalid LISTINGAPIS_API_KEY' },
    { restStatus: 503, code: 502, error: 'ListingAPIs unavailable', lastError: 'upstream 503' },
  ])('maps upstream $restStatus on data routes to $code when there is no data to serve', async ({ restStatus, code, error, lastError }) => {
    const { fetchImpl } = makeFetchImpl({ restStatus });
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: fetchImpl });
    await vi.advanceTimersByTimeAsync(0); // poller refresh settles with the failure

    for (const path of ['/trends', '/stats', '/exchanges']) {
      const res = await get(routes, path);
      expect(res.status, `${path} -> ${code}`).toBe(code);
      expect(await res.json()).toEqual({ error });
    }
    // /status stays 200 and still reports the key as configured + the failure
    const res = await get(routes, '/status');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'reconnecting', lastEventAt: null, lastError, keyConfigured: true });
  });

  it('serves 200 with partial data when only one poller endpoint fails', async () => {
    const { routes } = await startApp({ env: { LISTINGAPIS_API_KEY: 'k' }, fetchImpl: makeFetchImpl({ statsStatus: 402 }).fetchImpl });
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
