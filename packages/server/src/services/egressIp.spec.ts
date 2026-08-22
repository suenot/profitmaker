import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEgressIp,
  getCachedEgressIp,
  __resetEgressIpForTests,
} from './egressIp';

/**
 * Unit tests for egressIp.ts — global fetch stubbed, no network.
 *
 * The service keeps module-level cache/in-flight state; the test-only reset
 * hook restores a cold service before each case. Response stubs mimic the
 * plain-text IP echo endpoints the service reads (.ok/.status/.text).
 */

/** Build a Response-like stub matching what egressIp reads (.text). */
function textResponse(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}

beforeEach(() => {
  __resetEgressIpForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getEgressIp', () => {
  it('resolves and trims the IP from the first source', async () => {
    const fetchMock = vi.fn(async () => textResponse('203.0.113.7\n'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getEgressIp()).resolves.toBe('203.0.113.7');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('https://api.ipify.org', expect.anything());
    expect(getCachedEgressIp()).toBe('203.0.113.7');
  });

  it('falls back to the second source when the first fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://api.ipify.org') throw new Error('source down');
      return textResponse(' 198.51.100.4 ');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getEgressIp()).resolves.toBe('198.51.100.4');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a non-IP body as a failure and moves on to the next source', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn(async (url: string) =>
      url === 'https://api.ipify.org' ? textResponse('<html>proxy error page</html>') : textResponse('2001:db8::1'),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getEgressIp()).resolves.toBe('2001:db8::1');
    expect(warn).not.toHaveBeenCalled();
  });

  it('dedupes concurrent calls into one shared fetch', async () => {
    const fetchMock = vi.fn(async () => textResponse('203.0.113.7'));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([getEgressIp(), getEgressIp()]);
    expect(a).toBe('203.0.113.7');
    expect(b).toBe('203.0.113.7');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('serves the cached IP without refetching inside the TTL', async () => {
    const fetchMock = vi.fn(async () => textResponse('203.0.113.7'));
    vi.stubGlobal('fetch', fetchMock);

    await getEgressIp();
    await getEgressIp();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(getCachedEgressIp()).toBe('203.0.113.7');
  });

  it('returns null (and warns exactly once) when every source fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    await expect(getEgressIp()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(getCachedEgressIp()).toBeNull();
  });
});
