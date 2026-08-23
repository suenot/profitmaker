import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUserStreams } from './userStreams';
import type { FetchLike } from './apiClient';
import { makeStream, sseFrame } from './testStreams';
import type { ModuleListing } from '../shared/types';

const AUTH_URL = 'https://auth.test';
const API_URL = 'https://api.test';
const HOUR_MS = 60 * 60 * 1000;

const LISTING = (id: number): ModuleListing => ({
  id, exchange: 'e', symbol: `S${id}`, fullName: `S${id}`, type: 'listing',
  title: `t${id}`, url: null, listedAt: null, detectedAt: null, source: 's',
});

const payload = (id: number) => ({
  id, exchange: 'binance', symbol: `SYM${id}`, type: 'listing', title: `t${id}`,
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function issueResponse(key: string, status = 201): Response {
  return jsonResponse({ key, expires_at: new Date(Date.now() + 168 * HOUR_MS).toISOString() }, status);
}

const okStream = (chunks: string[]): Response => new Response(makeStream(chunks), { status: 200 });

/**
 * A 200 stream whose chunks only enqueue at `delayMs` on the (fake) clock, so
 * listeners can be registered after acquire() resolves but before any frame —
 * and before the 45s watchdog — deterministically.
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

interface HarnessOpts {
  limit?: number;
  idleMs?: number;
  /** Overrides the auth issue endpoint; defaults to minting sk_1, sk_2, ... */
  issue?: () => Response;
  /** Stream responder keyed on the Authorization header of the connect. */
  stream?: (auth: string) => Response;
}

function harness(opts: HarnessOpts = {}) {
  let mints = 0;
  const mintedKeys: string[] = [];
  const streamAuths: string[] = [];
  const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
    const url = String(input);
    if (url.startsWith(AUTH_URL)) {
      if (opts.issue) return opts.issue();
      mints += 1;
      const key = `sk_${mints}`;
      mintedKeys.push(key);
      return issueResponse(key);
    }
    if (url === `${API_URL}/api/public/stream`) {
      const auth = ((init?.headers as Record<string, string>) ?? {}).Authorization;
      streamAuths.push(auth);
      return opts.stream ? opts.stream(auth) : okStream([sseFrame('hello', { ok: true }), sseFrame('listing', payload(5))]);
    }
    if (url.startsWith(`${API_URL}/api/public/listings`)) return jsonResponse({ listings: [] });
    return new Response(null, { status: 404 });
  });
  const streams = createUserStreams({
    authInternalUrl: AUTH_URL,
    authInternalSecret: 'internal-secret',
    apiBaseUrl: API_URL,
    fetchImpl,
    limit: opts.limit,
    idleMs: opts.idleMs,
  });
  return {
    streams,
    fetchImpl,
    mintedKeys,
    streamAuths,
    /** Calls that reached the auth issue endpoint (getter: the count mutates). */
    authCalls: () => fetchImpl.mock.calls.filter((c) => String(c[0]).startsWith(AUTH_URL)).length,
  };
}

/** Spy on every console channel we forbid; returns an assert-silence helper. */
function consoleSpy() {
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const spies = methods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  return () => spies.forEach((s) => expect(s).not.toHaveBeenCalled());
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('createUserStreams', () => {
  it('acquires lazily: one mint, one stream connection with the per-user key, listeners wired', async () => {
    const assertSilent = consoleSpy();
    const h = harness({ stream: () => delayedStream(1_000, [sseFrame('hello', { ok: true }), sseFrame('listing', payload(5))]) });
    const seenListings: ModuleListing[] = [];
    const seenStatuses: string[] = [];

    const a = await h.streams.acquire('user-1');
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(h.mintedKeys).toEqual(['sk_1']);
    expect(h.streams.activeCount()).toBe(1);
    expect(a.stream.status()).toBe('connecting'); // still parked on the stream body
    // Listeners registered after acquire see everything: no frame moved yet.
    a.stream.onListing((l) => seenListings.push(l));
    a.stream.onStatus((s) => seenStatuses.push(s));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(seenStatuses).toEqual(['up']);
    expect(seenListings.map((l) => l.id)).toEqual([5]);
    expect(a.stream.status()).toBe('up');
    expect(h.streamAuths).toEqual(['Bearer sk_1']);
    assertSilent();
    h.streams.dispose();
  });

  it('two acquires of the same user share one entry and never re-mint while live', async () => {
    const h = harness();
    const a = await h.streams.acquire('user-1');
    const b = await h.streams.acquire('user-1');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.stream).toBe(a.stream);
    expect(h.authCalls()).toBe(1);
    expect(h.streamAuths).toEqual(['Bearer sk_1']);
    expect(h.streams.activeCount()).toBe(1);
    h.streams.dispose();
  });

  it('parallel cold acquires of the same user share one mint and one stream', async () => {
    const h = harness();
    const [a, b] = await Promise.all([h.streams.acquire('user-1'), h.streams.acquire('user-1')]);
    if (!a.ok || !b.ok) throw new Error('expected both acquires to succeed');
    expect(b.stream).toBe(a.stream);
    expect(h.authCalls()).toBe(1);
    expect(h.streamAuths).toEqual(['Bearer sk_1']);
    expect(h.streams.activeCount()).toBe(1);
    h.streams.dispose();
  });

  it('drops the entry after the last subscriber leaves and idleMs passes; re-acquire recreates it', async () => {
    // First connect delivers a listing; later connects stay quiet so the fresh
    // ring is provably empty right after re-acquire.
    const h = harness({
      idleMs: 60_000,
      stream: () => (h.streamAuths.length <= 1
        ? okStream([sseFrame('listing', payload(5))])
        : okStream([sseFrame('hello', { ok: true })])),
    });
    const a = await h.streams.acquire('user-1');
    if (!a.ok) throw new Error('expected acquire to succeed');
    await vi.advanceTimersByTimeAsync(0);
    expect(a.stream.ring.size()).toBe(1);

    h.streams.subscriberRemoved('user-1'); // last subscriber -> idle countdown
    await vi.advanceTimersByTimeAsync(59_999);
    expect(h.streams.activeCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.streams.activeCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0); // the SSE service is fully stopped

    // Nothing reconnects once torn down (watchdog/reconnect machinery is dead).
    const callsAtTeardown = h.fetchImpl.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.fetchImpl.mock.calls.length).toBe(callsAtTeardown);

    // Re-acquire recreates the entry with a fresh ring. The 168h key is still
    // fresh in the resolver cache, so it is reused — a new mint here would
    // hammer auth-service every idle cycle (the 401 test covers true re-mints).
    const b = await h.streams.acquire('user-1');
    if (!b.ok) throw new Error('expected re-acquire to succeed');
    expect(b.stream).not.toBe(a.stream);
    expect(h.mintedKeys).toEqual(['sk_1']);
    expect(h.authCalls()).toBe(1);
    expect(h.streamAuths[h.streamAuths.length - 1]).toBe('Bearer sk_1');
    expect(b.stream.ring.size()).toBe(0);
    expect(h.streams.activeCount()).toBe(1);
    h.streams.dispose();
  });

  it('two acquires count two subscribers: teardown only after both leave', async () => {
    const h = harness({ idleMs: 60_000 });
    await h.streams.acquire('user-1');
    await h.streams.acquire('user-1');

    h.streams.subscriberRemoved('user-1');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.streams.activeCount()).toBe(1); // one subscriber still holds the entry

    h.streams.subscriberRemoved('user-1');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.streams.activeCount()).toBe(0);
    h.streams.dispose();
  });

  it('subscriberAdded cancels a running idle countdown', async () => {
    const h = harness({ idleMs: 60_000 });
    await h.streams.acquire('user-1');
    h.streams.subscriberRemoved('user-1');
    h.streams.subscriberAdded('user-1');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.streams.activeCount()).toBe(1);
    h.streams.dispose();
  });

  it('enforces the stream limit: a new user at cap gets reason "cap" without minting', async () => {
    const h = harness({ limit: 1 });
    const a = await h.streams.acquire('user-1');
    expect(a.ok).toBe(true);
    const b = await h.streams.acquire('user-2');
    expect(b).toEqual({ ok: false, reason: 'cap' });
    expect(h.authCalls()).toBe(1); // user-2 was never minted
    expect(h.streamAuths).toEqual(['Bearer sk_1']);
    expect(h.streams.activeCount()).toBe(1);
    h.streams.dispose();
  });

  it('propagates key resolution failures with no entry and no stream', async () => {
    const assertSilent = consoleSpy();
    const h = harness({ issue: () => new Response('{"error":"no plan"}', { status: 403 }) });
    expect(await h.streams.acquire('user-1')).toEqual({ ok: false, reason: 'no-subscription' });
    expect(h.streams.activeCount()).toBe(0);
    expect(h.streamAuths).toEqual([]);
    assertSilent();
  });

  it('parks a 30s per-user backoff after a failed acquire, then retries', async () => {
    const queue: Response[] = [
      new Response('{"error":"no plan"}', { status: 403 }),
      issueResponse('sk_after_backoff'),
    ];
    const h = harness({ idleMs: 60_000, issue: () => queue.shift() ?? issueResponse('sk_extra') });

    expect(await h.streams.acquire('user-1')).toEqual({ ok: false, reason: 'no-subscription' });
    // Immediate retry: parked, resolver not called again.
    expect(await h.streams.acquire('user-1')).toEqual({ ok: false, reason: 'no-subscription' });
    expect(h.authCalls()).toBe(1);

    await vi.advanceTimersByTimeAsync(29_999);
    expect(await h.streams.acquire('user-1')).toEqual({ ok: false, reason: 'no-subscription' });
    expect(h.authCalls()).toBe(1); // still inside the 30s window

    await vi.advanceTimersByTimeAsync(1); // backoff expires
    const ok = await h.streams.acquire('user-1');
    expect(ok.ok).toBe(true);
    expect(h.authCalls()).toBe(2);

    // The successful acquire cleared the backoff: after idle teardown a fresh
    // acquire recreates the entry (cached key) instead of answering the stale
    // parked failure.
    h.streams.subscriberRemoved('user-1');
    await vi.advanceTimersByTimeAsync(60_000);
    const again = await h.streams.acquire('user-1');
    expect(again.ok).toBe(true);
    expect(h.streams.activeCount()).toBe(1);
    expect(h.authCalls()).toBe(2); // resolver served the fresh cached key
    h.streams.dispose();
  });

  it('upstream 401 invalidates the key and tears the stream down; next acquire re-mints', async () => {
    const h = harness({
      stream: (auth) => (auth === 'Bearer sk_1'
        ? new Response(null, { status: 401 })
        : okStream([sseFrame('hello', { ok: true })])),
    });
    const a = await h.streams.acquire('user-1');
    expect(a.ok).toBe(true);

    await vi.advanceTimersByTimeAsync(0); // connect gets the 401
    expect(h.streams.activeCount()).toBe(0); // entry torn down immediately

    // No reconnect storm: the dead entry's SSE service is stopped for good.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.streamAuths).toEqual(['Bearer sk_1']);

    // invalidate() dropped the cached key: re-acquire mints a NEW one.
    const b = await h.streams.acquire('user-1');
    expect(b.ok).toBe(true);
    expect(h.mintedKeys).toEqual(['sk_1', 'sk_2']);
    expect(h.streamAuths).toEqual(['Bearer sk_1', 'Bearer sk_2']);
    h.streams.dispose();
  });

  it('dispose stops every stream and makes later acquires fail fast', async () => {
    const h = harness();
    await h.streams.acquire('user-1');
    await h.streams.acquire('user-2');
    await vi.advanceTimersByTimeAsync(0);
    h.streams.dispose();
    expect(h.streams.activeCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    const calls = h.fetchImpl.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(h.fetchImpl.mock.calls.length).toBe(calls); // nothing left to reconnect

    expect(await h.streams.acquire('user-3')).toEqual({ ok: false, reason: 'auth-unavailable' });
    expect(h.authCalls()).toBe(2); // user-3 never reached the resolver
  });

  it('rings and listeners are isolated per user; the ring caps at 50', async () => {
    const h = harness({
      stream: (auth) => (auth === 'Bearer sk_1'
        ? delayedStream(1_000, [sseFrame('listing', payload(101))])
        : delayedStream(1_000, [sseFrame('listing', payload(202))])),
    });
    const seen1: number[] = [];
    const seen2: number[] = [];
    const a = await h.streams.acquire('user-1');
    const b = await h.streams.acquire('user-2');
    if (!a.ok || !b.ok) throw new Error('expected both acquires to succeed');
    a.stream.onListing((l) => seen1.push(l.id));
    b.stream.onListing((l) => seen2.push(l.id));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(seen1).toEqual([101]);
    expect(seen2).toEqual([202]);
    expect(a.stream.ring.has(101)).toBe(true);
    expect(a.stream.ring.has(202)).toBe(false);
    expect(b.stream.ring.has(202)).toBe(true);
    expect(b.stream.ring.has(101)).toBe(false);

    for (let i = 0; i < 60; i += 1) a.stream.ring.add(LISTING(i));
    expect(a.stream.ring.size()).toBe(50);
    expect(b.stream.ring.size()).toBe(1); // user-2's ring untouched by user-1 adds
    h.streams.dispose();
  });
});
