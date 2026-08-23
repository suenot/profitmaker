import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKeyResolver, type KeyResult } from './keyResolver';
import type { FetchLike } from './apiClient';

const HOUR_MS = 60 * 60 * 1000;
const ISSUE_PATH = '/api/v1/internal/service-keys/issue';

/** 201 issue response with `expires_at` offset from now by `hours`. */
function issueResponse(hours: number, key = 'sk_test_key', status = 201): Response {
  return new Response(
    JSON.stringify({ key, expires_at: new Date(Date.now() + hours * HOUR_MS).toISOString() }),
    { status, headers: { 'content-type': 'application/json' } },
  );
}

function resolverWith(secret = 'internal-secret') {
  const fetchImpl = vi.fn<FetchLike>();
  const resolver = createKeyResolver({ authInternalUrl: 'https://auth.test', authInternalSecret: secret, fetchImpl });
  return { resolver, fetchImpl };
}

/** Spy on every console channel we forbid; returns an assert-silence helper. */
function consoleSpy() {
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const spies = methods.map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  return () => spies.forEach((s) => expect(s).not.toHaveBeenCalled());
}

describe('createKeyResolver', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mints via POST with secret header and the fixed issue body', async () => {
    const { resolver, fetchImpl } = resolverWith();
    const issuedAt = Date.now();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_first'));

    const res = await resolver.getKey('user-1');

    expect((res as Extract<KeyResult, { ok: true }>).key).toBe('sk_first');
    // Date.parse truncates to ms, so the minted epoch lands within a ms of now+168h.
    expect((res as Extract<KeyResult, { ok: true }>).expiresAt).toBeCloseTo(issuedAt + 168 * HOUR_MS, -1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://auth.test${ISSUE_PATH}`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Internal-Secret']).toBe('internal-secret');
    expect(headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      requester_user_id: 'user-1',
      service: 'listingapis',
      label: 'profitmaker-terminal',
      ttl_hours: 168,
    });
  });

  it('caches per user: two calls mint once and return the same entry', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_cached'));

    const first = await resolver.getKey('user-1');
    const second = await resolver.getKey('user-1');

    expect(second).toStrictEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches are isolated per user', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_a'));
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_b'));

    const a = await resolver.getKey('user-a');
    const b = await resolver.getKey('user-b');

    expect((a as Extract<KeyResult, { ok: true }>).key).toBe('sk_a');
    expect((b as Extract<KeyResult, { ok: true }>).key).toBe('sk_b');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('force re-mints even with a fresh cache entry', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_old'));
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_new'));

    await resolver.getKey('user-1');
    const res = await resolver.getKey('user-1', { force: true });

    expect((res as Extract<KeyResult, { ok: true }>).key).toBe('sk_new');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('re-mints when remaining ttl drops under 12h', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(6, 'sk_expiring'));
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_reminted'));

    await resolver.getKey('user-1');
    const res = await resolver.getKey('user-1');

    expect((res as Extract<KeyResult, { ok: true }>).key).toBe('sk_reminted');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('keeps the cache while remaining ttl is at least 12h', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(13, 'sk_fresh'));

    await resolver.getKey('user-1');
    await resolver.getKey('user-1');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps 403 to no-subscription and 429 to cap without caching', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(new Response('{"error":"no plan"}', { status: 403 }));
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_after_403'));
    fetchImpl.mockResolvedValueOnce(new Response('{"error":"rate"}', { status: 429 }));

    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'no-subscription' });
    // A failure must not poison the cache: the next call mints again.
    expect(await resolver.getKey('user-1')).toEqual({ ok: true, key: 'sk_after_403', expiresAt: expect.any(Number) });
    // Another user: the fresh user-1 cache must not mask the 429 path.
    expect(await resolver.getKey('user-2')).toEqual({ ok: false, reason: 'cap' });
  });

  it('maps 5xx and network failure to auth-unavailable', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(new Response('boom', { status: 502 }));
    fetchImpl.mockRejectedValueOnce(new Error('network down'));

    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'auth-unavailable' });
    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'auth-unavailable' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('maps non-JSON, keyless and expiry-less 2xx bodies to bad-response', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(new Response('not json at all', { status: 201, headers: { 'content-type': 'text/plain' } }));
    fetchImpl.mockResolvedValueOnce(new Response('{"expires_at":"2099-01-01T00:00:00Z"}', { status: 201, headers: { 'content-type': 'application/json' } }));
    fetchImpl.mockResolvedValueOnce(new Response('{"key":"sk_x","expires_at":"not-a-date"}', { status: 201, headers: { 'content-type': 'application/json' } }));

    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'bad-response' });
    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'bad-response' });
    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('maps unexpected 4xx to bad-response', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(new Response('{"error":"bad request"}', { status: 400 }));

    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('returns bridge-unconfigured without fetching when the secret is empty', async () => {
    const { resolver, fetchImpl } = resolverWith('');
    const assertSilent = consoleSpy();

    expect(await resolver.getKey('user-1')).toEqual({ ok: false, reason: 'bridge-unconfigured' });
    expect(await resolver.getKey('user-1', { force: true })).toEqual({ ok: false, reason: 'bridge-unconfigured' });
    expect(fetchImpl).not.toHaveBeenCalled();
    assertSilent();
  });

  it('never logs keys or secrets on any path', async () => {
    const assertSilent = consoleSpy();
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_secret_key'));
    fetchImpl.mockRejectedValueOnce(new Error('network down'));
    fetchImpl.mockResolvedValueOnce(new Response('{"error":"no plan"}', { status: 403 }));

    await resolver.getKey('user-1');
    await resolver.getKey('user-1');
    await resolver.getKey('user-2');

    assertSilent();
  });

  it('mints once for parallel cold-cache calls of the same user', async () => {
    const { resolver, fetchImpl } = resolverWith();
    // Deferred response so both callers are guaranteed in-flight together.
    let release!: (res: Response) => void;
    fetchImpl.mockImplementationOnce(() => new Promise<Response>((resolve) => { release = resolve; }));

    const a = resolver.getKey('user-1');
    const b = resolver.getKey('user-1');
    release(issueResponse(168, 'sk_parallel'));
    const [ra, rb] = await Promise.all([a, b]);

    expect(ra).toEqual({ ok: true, key: 'sk_parallel', expiresAt: expect.any(Number) });
    expect(rb).toStrictEqual(ra);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caps the cache at 100 users: the oldest mint is FIFO-evicted', async () => {
    const { resolver, fetchImpl } = resolverWith();
    // 101 distinct auth users mint fresh keys; user-1 is the oldest and falls out.
    for (let i = 1; i <= 101; i += 1) fetchImpl.mockResolvedValueOnce(issueResponse(168, `sk_${i}`));
    for (let i = 1; i <= 101; i += 1) await resolver.getKey(`user-${i}`);
    expect(fetchImpl).toHaveBeenCalledTimes(101);

    // user-1 was evicted -> re-minted (and that insert evicts user-2, the
    // then-oldest — FIFO keeps rolling); a mid-cache user stays cached.
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_1_again'));
    const first = await resolver.getKey('user-1');
    const mid = await resolver.getKey('user-50');
    expect((first as Extract<KeyResult, { ok: true }>).key).toBe('sk_1_again');
    expect((mid as Extract<KeyResult, { ok: true }>).key).toBe('sk_50');
    expect(fetchImpl).toHaveBeenCalledTimes(102);
  });

  it('invalidate drops the cache entry so the next call re-mints', async () => {
    const { resolver, fetchImpl } = resolverWith();
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_before'));
    fetchImpl.mockResolvedValueOnce(issueResponse(168, 'sk_after'));

    await resolver.getKey('user-1');
    resolver.invalidate('user-1');
    const res = await resolver.getKey('user-1');

    expect((res as Extract<KeyResult, { ok: true }>).key).toBe('sk_after');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Invalidating an unknown user is a no-op.
    resolver.invalidate('nobody');
  });
});
