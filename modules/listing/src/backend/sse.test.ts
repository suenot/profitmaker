import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSseService } from './sse';
import type { FetchLike } from './apiClient';
import { createListingRing } from './ringBuffer';
import { makeHeartbeatStream, makeStream, sseFrame } from './testStreams';
import type { ModuleListing } from '../shared/types';

const STREAM_URL = 'https://api.test/api/public/stream';

const LISTING = (id: number): ModuleListing => ({
  id, exchange: 'e', symbol: `S${id}`, fullName: `S${id}`, type: 'listing',
  title: `t${id}`, url: null, listedAt: null, detectedAt: null, source: 's',
});

const payload = (id: number) => ({
  id, exchange: 'binance', symbol: `SYM${id}`, type: 'listing', title: `t${id}`,
});

const okResponse = (chunks: string[]): Response => new Response(makeStream(chunks), { status: 200 });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('connects, goes up on the first frame, and emits listing events', async () => {
  const seen: ModuleListing[] = [];
  const statuses: string[] = [];
  const fetchImpl = vi.fn<FetchLike>(async () => okResponse([
    sseFrame('hello', { ok: true }),
    sseFrame('listing', payload(5)),
  ]));
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: (l) => seen.push(l),
    onStatus: (s) => statuses.push(s),
    fetchImpl,
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0);

  // request shape: stream URL + Bearer auth + SSE accept header
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toBe(STREAM_URL);
  const init = fetchImpl.mock.calls[0][1] as RequestInit;
  expect(init.headers).toEqual({ Authorization: 'Bearer k', Accept: 'text/event-stream' });

  // hello frame -> up (no listing emission); listing frame -> emitted once
  expect(statuses).toEqual(['up']);
  expect(seen.map((l) => l.id)).toEqual([5]);
  const st = svc.getStatus();
  expect(st.status).toBe('up');
  expect(st.lastError).toBeNull();
  expect(typeof st.lastEventAt).toBe('number');
  svc.stop();
});

it('treats heartbeat comments as liveness: up transition and watchdog feed', async () => {
  const statuses: string[] = [];
  // comment pings at t=0, 40s, 80s (watchdog deadline is last traffic + 45s)
  const fetchImpl = vi.fn<FetchLike>(async () =>
    new Response(makeHeartbeatStream(40_000, 3), { status: 200 }));
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: vi.fn(),
    onStatus: (s) => statuses.push(s),
    fetchImpl,
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0);
  // the very first frame is a comment-only heartbeat: still counts as connected
  expect(statuses).toEqual(['up']);

  await vi.advanceTimersByTimeAsync(40_000); // ping at t=40s keeps the watchdog fed
  expect(svc.getStatus().status).toBe('up');
  expect(fetchImpl).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(40_000); // ping at t=80s keeps it fed again
  expect(svc.getStatus().status).toBe('up');
  expect(statuses).toEqual(['up']);

  await vi.advanceTimersByTimeAsync(45_500); // silence past t=125s -> watchdog fires
  expect(statuses).toEqual(['up', 'reconnecting']);
  expect(svc.getStatus().lastError).toContain('heartbeat');
  expect(fetchImpl).toHaveBeenCalledTimes(1); // reconnect scheduled, not run yet
  svc.stop();
});

it('reassembles frames split across chunks', async () => {
  const seen: ModuleListing[] = [];
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: (l) => seen.push(l),
    onStatus: vi.fn(),
    fetchImpl: vi.fn<FetchLike>(async () =>
      okResponse(['event: list', `ing\ndata: ${JSON.stringify(payload(11))}\n\n`])),
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(seen.map((l) => l.id)).toEqual([11]);
  svc.stop();
});

it('falls back to REST polling after two consecutive failures', async () => {
  const seen: number[] = [];
  const statuses: string[] = [];
  const getListings = vi.fn<(limit: number) => Promise<ModuleListing[]>>()
    .mockResolvedValue([LISTING(7), LISTING(8)]);
  const fetchImpl = vi.fn<FetchLike>()
    .mockResolvedValueOnce(new Response(null, { status: 503 })) // non-200 counts as failure
    .mockRejectedValueOnce(new Error('down'))
    .mockRejectedValueOnce(new Error('down'));
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings },
    ring: createListingRing(),
    onListing: (l) => seen.push(l.id),
    onStatus: (s) => statuses.push(s),
    fetchImpl,
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0); // failure #1 (HTTP 503) -> reconnect in 1s
  expect(svc.getStatus().status).toBe('reconnecting');
  expect(svc.getStatus().lastError).toContain('503');

  await vi.advanceTimersByTimeAsync(1_000); // failure #2 -> polling mode
  expect(svc.getStatus().status).toBe('polling');
  expect(getListings).not.toHaveBeenCalled(); // first poll is one interval away

  await vi.advanceTimersByTimeAsync(30_000); // t=31s: first poll emits REST listings
  expect(getListings).toHaveBeenCalledWith(10);
  expect(seen).toEqual([7, 8]);

  await vi.advanceTimersByTimeAsync(30_000); // t=61s: poll repeats (dedup) + SSE retry #3 fails
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(seen).toEqual([7, 8]); // ring dedup: nothing re-emitted
  expect(svc.getStatus().status).toBe('polling'); // still polling, not reconnecting
  expect(statuses).toEqual(['reconnecting', 'polling']);
  svc.stop();
  expect(vi.getTimerCount()).toBe(0);
});

it('recovers to up when SSE reconnects while polling', async () => {
  const seen: number[] = [];
  const statuses: string[] = [];
  const getListings = vi.fn<(limit: number) => Promise<ModuleListing[]>>()
    .mockResolvedValueOnce([LISTING(7)])
    .mockResolvedValueOnce([LISTING(8)])
    .mockResolvedValue([LISTING(99)]); // must never be fetched after recovery
  const fetchImpl = vi.fn<FetchLike>()
    .mockRejectedValueOnce(new Error('down'))
    .mockRejectedValueOnce(new Error('down'))
    .mockResolvedValueOnce(okResponse([sseFrame('hello', { ok: true }), sseFrame('listing', payload(9))]));
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings },
    ring: createListingRing(),
    onListing: (l) => seen.push(l.id),
    onStatus: (s) => statuses.push(s),
    fetchImpl,
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0); // failure #1
  await vi.advanceTimersByTimeAsync(1_000); // failure #2 -> polling
  await vi.advanceTimersByTimeAsync(30_000); // poll #1
  expect(seen).toEqual([7]);

  await vi.advanceTimersByTimeAsync(30_000); // t=61s: poll #2 + SSE retry succeeds
  expect(seen).toEqual([7, 8, 9]);
  expect(svc.getStatus().status).toBe('up');

  await vi.advanceTimersByTimeAsync(30_000); // t=91s: would-be poll tick never fires
  expect(getListings).toHaveBeenCalledTimes(2);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(statuses).toEqual(['reconnecting', 'polling', 'up']);
  svc.stop();
});

it('emits onListing only for new ids (ring dedup)', async () => {
  const seen: number[] = [];
  const ring = createListingRing();
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring,
    onListing: (l) => seen.push(l.id),
    onStatus: vi.fn(),
    fetchImpl: vi.fn<FetchLike>(async () => okResponse([
      sseFrame('listing', payload(5)),
      sseFrame('listing', payload(5)), // duplicate id
      sseFrame('listing', payload(6)),
    ])),
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(seen).toEqual([5, 6]);
  expect(ring.size()).toBe(2);
  svc.stop();
});

it('backfill fills the ring via REST without emitting onListing', async () => {
  const onListing = vi.fn();
  const getListings = vi.fn<(limit: number) => Promise<ModuleListing[]>>()
    .mockResolvedValue([LISTING(1), LISTING(2)]);
  const ring = createListingRing();
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings },
    ring,
    onListing,
    onStatus: vi.fn(),
    fetchImpl: vi.fn<FetchLike>(),
  });
  await svc.backfill();
  expect(getListings).toHaveBeenCalledWith(100);
  expect(ring.size()).toBe(2);
  await svc.backfill(5);
  expect(getListings).toHaveBeenLastCalledWith(5);
  expect(onListing).not.toHaveBeenCalled();
});

it('retries billing failures (HTTP 402) at the slow 5-minute cadence', async () => {
  const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response(null, { status: 402 }));
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: vi.fn(),
    onStatus: vi.fn(),
    fetchImpl,
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0); // billing failure #1 -> slow retry scheduled
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toBe(STREAM_URL);

  await vi.advanceTimersByTimeAsync(60_000); // past the normal 60s backoff cap
  expect(fetchImpl).toHaveBeenCalledTimes(1); // still waiting: connections are billed

  await vi.advanceTimersByTimeAsync(240_000); // t=300s: the slow retry fires
  expect(fetchImpl).toHaveBeenCalledTimes(2);  // fails again -> another 5-minute wait
  svc.stop();
  expect(vi.getTimerCount()).toBe(0);
});

it('stop() clears every timer', async () => {
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: vi.fn(),
    onStatus: vi.fn(),
    fetchImpl: vi.fn<FetchLike>().mockRejectedValueOnce(new Error('down')),
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0); // failure -> reconnect scheduled in 1s
  expect(svc.getStatus().status).toBe('reconnecting');
  expect(vi.getTimerCount()).toBe(1); // exactly the reconnect timer
  svc.stop();
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(60_000); // nothing resurrects
  expect(vi.getTimerCount()).toBe(0);
});
