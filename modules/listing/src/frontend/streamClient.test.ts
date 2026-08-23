import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSseFrame, subscribeListingStream } from './streamClient';
import type { ModuleListing } from '../shared/types';

/** Let the async read loop settle: a few microtask rounds per pending hop. */
const flush = async (rounds = 12) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const enc = new TextEncoder();

/** A controllable SSE body: push text, end it, observe reader cancellation. */
function pushableStream() {
  let ctl!: ReadableStreamDefaultController<Uint8Array>;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(c) { ctl = c; },
    cancel() { cancelled = true; },
  });
  return {
    body,
    response: () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    push: (text: string) => ctl.enqueue(enc.encode(text)),
    end: () => ctl.close(),
    get cancelled() { return cancelled; },
  };
}

const errorResponse = (status: number, body: unknown) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Scripted endpoint: every fetch consumes the next scripted response factory. */
function endpoint(script: Array<() => Response>) {
  const calls: Array<{ url: string; signal?: AbortSignal }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, signal: init?.signal ?? undefined });
    const make = script.shift();
    if (!make) throw new Error(`unexpected fetch call #${calls.length}`);
    return make();
  });
  return { calls, fetchImpl };
}

const LISTING: ModuleListing = {
  id: 7, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin', type: 'listing',
  title: 't', url: null, listedAt: null, detectedAt: null, source: null,
};

function subscribe(over: Partial<Parameters<typeof subscribeListingStream>[0]> = {}) {
  const onListing = vi.fn();
  const onStatus = vi.fn();
  const onError = vi.fn();
  const sub = subscribeListingStream({
    url: '/api/modules/listing/stream',
    onListing,
    onStatus,
    onError,
    ...over,
  });
  return { sub, onListing, onStatus, onError };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('parseSseFrame', () => {
  it('extracts event and data', () => {
    expect(parseSseFrame('event: listing\ndata: {"id":1}')).toEqual({ event: 'listing', data: '{"id":1}' });
  });
  it('joins multi-line data with newlines', () => {
    expect(parseSseFrame('event: listing\ndata: {"a":\ndata: 1}')).toEqual({ event: 'listing', data: '{"a":\n1}' });
  });
  it('drops comment-only (heartbeat) frames', () => {
    expect(parseSseFrame(': heartbeat')).toBeNull();
  });
  it('defaults the event name to message', () => {
    expect(parseSseFrame('data: x')).toEqual({ event: 'message', data: 'x' });
  });
  it('tolerates a missing space after the field colon', () => {
    expect(parseSseFrame('event:status\ndata:x')).toEqual({ event: 'status', data: 'x' });
  });
});

describe('subscribeListingStream: frame dispatch', () => {
  it('dispatches listing and status frames, ignores hello', async () => {
    const s = pushableStream();
    const { fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s.push('event: hello\ndata: {"userId":"u1"}\n\n');
    s.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    s.push('event: status\ndata: {"state":"up"}\n\n');
    await flush();
    expect(h.onListing).toHaveBeenCalledTimes(1);
    expect(h.onListing).toHaveBeenCalledWith(LISTING);
    expect(h.onStatus).toHaveBeenCalledWith('up');
    expect(h.onError).not.toHaveBeenCalled();
    h.sub.close();
  });

  it('ignores heartbeat comment frames', async () => {
    const s = pushableStream();
    const { fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s.push(': heartbeat\n\n');
    s.push(': heartbeat\n\n');
    s.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    expect(h.onListing).toHaveBeenCalledTimes(1);
    expect(h.onError).not.toHaveBeenCalled();
    h.sub.close();
  });

  it('buffers partial chunks until a frame is complete', async () => {
    const s = pushableStream();
    const { fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s.push('event: listing\nda');
    await flush();
    expect(h.onListing).not.toHaveBeenCalled();
    s.push('ta: {"id":');
    await flush();
    expect(h.onListing).not.toHaveBeenCalled();
    s.push('1}\n\n');
    await flush();
    expect(h.onListing).toHaveBeenCalledTimes(1);
    expect(h.onListing).toHaveBeenCalledWith({ id: 1 });
    h.sub.close();
  });

  it('reports malformed frame data but keeps the stream alive', async () => {
    const s = pushableStream();
    const { fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s.push('event: listing\ndata: {oops}\n\n');
    s.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    expect(h.onError).toHaveBeenCalledTimes(1);
    expect(h.onError.mock.calls[0][0].message).toContain('malformed');
    expect(h.onListing).toHaveBeenCalledWith(LISTING);
    h.sub.close();
  });

  it('ignores status frames without a string state', async () => {
    const s = pushableStream();
    const { fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s.push('event: status\ndata: {"state":null}\n\n');
    await flush();
    expect(h.onStatus).not.toHaveBeenCalled();
    expect(h.onError).not.toHaveBeenCalled();
    h.sub.close();
  });
});

describe('subscribeListingStream: reconnect', () => {
  it('retries on stream end with a 1s→2s→4s backoff', async () => {
    const s1 = pushableStream();
    const s2 = pushableStream();
    const s3 = pushableStream();
    const { calls, fetchImpl } = endpoint([s1.response, s2.response, s3.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s1.end();
    await flush();
    await vi.advanceTimersByTimeAsync(999);
    expect(calls.length).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.length).toBe(2);
    s2.end();
    await flush();
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls.length).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.length).toBe(3);
    h.sub.close();
  });

  it('caps the backoff at 60s', async () => {
    // Eight immediately-ending streams: expected retry delays 1,2,4,8,16,32,60,60s.
    const script = Array.from({ length: 8 }, () => () => {
      const s = pushableStream();
      const res = s.response();
      s.end();
      return res;
    });
    const { calls, fetchImpl } = endpoint(script);
    const h = subscribe({ fetchImpl });
    await flush();
    const delays = [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000];
    let expected = 1;
    for (const d of delays) {
      await vi.advanceTimersByTimeAsync(d - 1);
      expect(calls.length).toBe(expected);
      await vi.advanceTimersByTimeAsync(1);
      expected += 1;
      expect(calls.length).toBe(expected);
      await flush();
    }
    h.sub.close();
  });

  it('resets the backoff after a successful frame', async () => {
    const s1 = pushableStream();
    const s2 = pushableStream();
    const s3 = pushableStream();
    const { calls, fetchImpl } = endpoint([s1.response, s2.response, s3.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    // Cycle 1 carries a frame: retry #2 owes 1s.
    s1.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    s1.end();
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls.length).toBe(2);
    // Cycle 2 is frameless: retry #3 owes 2s.
    s2.end();
    await flush();
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls.length).toBe(3);
    // Cycle 3 carries a frame again: the backoff restarted, so retry #4 owes
    // 1s — not the 4s an unreset schedule would demand.
    s3.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    s3.end();
    await flush();
    await vi.advanceTimersByTimeAsync(999);
    expect(calls.length).toBe(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.length).toBe(4);
    h.sub.close();
  });

  it('surfaces the JSON error body and reconnects on 503', async () => {
    const s2 = pushableStream();
    const { calls, fetchImpl } = endpoint([
      errorResponse(503, { error: 'listing streams busy, retry shortly', retryAfterSeconds: 60 }),
      s2.response,
    ]);
    const h = subscribe({ fetchImpl });
    await flush();
    expect(h.onError).toHaveBeenCalledWith({ status: 503, message: 'listing streams busy, retry shortly' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls.length).toBe(2);
    s2.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    expect(h.onListing).toHaveBeenCalledWith(LISTING);
    h.sub.close();
  });

  it.each([401, 403])('does not reconnect after a terminal %i', async (status) => {
    const { calls, fetchImpl } = endpoint([errorResponse(status, { error: 'user identity required' })]);
    const h = subscribe({ fetchImpl });
    await flush();
    expect(h.onError).toHaveBeenCalledWith({ status, message: 'user identity required' });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(calls.length).toBe(1);
    h.sub.close();
  });

  it('reconnects after a network failure', async () => {
    const s2 = pushableStream();
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(s2.response());
    const h = subscribe({ fetchImpl });
    await flush();
    expect(h.onError).toHaveBeenCalledWith({ status: 0, message: 'boom' });
    await vi.advanceTimersByTimeAsync(1000);
    s2.push(`event: listing\ndata: ${JSON.stringify(LISTING)}\n\n`);
    await flush();
    expect(h.onListing).toHaveBeenCalledWith(LISTING);
    h.sub.close();
  });

  it('treats an expired status frame followed by close as a reconnect trigger', async () => {
    const s1 = pushableStream();
    const s2 = pushableStream();
    const { calls, fetchImpl } = endpoint([s1.response, s2.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    s1.push('event: status\ndata: {"state":"expired"}\n\n');
    await flush();
    s1.end();
    await flush();
    expect(h.onStatus).toHaveBeenCalledWith('expired');
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls.length).toBe(2);
    h.sub.close();
  });
});

describe('subscribeListingStream: close', () => {
  it('is idempotent, aborts the fetch and cancels the reader', async () => {
    const s = pushableStream();
    const { calls, fetchImpl } = endpoint([s.response]);
    const h = subscribe({ fetchImpl });
    await flush();
    h.sub.close();
    h.sub.close();
    expect(calls[0].signal?.aborted).toBe(true);
    expect(s.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(61_000);
    expect(calls.length).toBe(1);
  });

  it('clears a pending reconnect timer', async () => {
    const s = pushableStream();
    const res = s.response();
    s.end();
    const { calls, fetchImpl } = endpoint([() => res]);
    const h = subscribe({ fetchImpl });
    await flush();
    h.sub.close();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(calls.length).toBe(1);
  });
});
