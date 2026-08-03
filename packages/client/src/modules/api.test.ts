import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * `moduleFetch` is the fetch handed to third-party module bundles as
 * `terminal.api.fetch`, and the Bearer token it attaches authorizes the entire
 * /api/* surface (orders, accounts, dashboards). These tests pin the rule that
 * it only ever talks to the terminal server's own origin — a regression here
 * silently hands the session token to whatever host a module names.
 */

const SERVER_URL = 'https://terminal.example.com';
const TOKEN = 'sso-session-token';

vi.mock('@/store/dataProviderStore', () => ({
  useDataProviderStore: {
    getState: () => ({
      providers: {
        'primary-server': {
          id: 'primary-server',
          type: 'ccxt-server',
          status: 'connected',
          config: { serverUrl: SERVER_URL, token: 'provider-token' },
        },
      },
    }),
  },
}));

vi.mock('@/services/ssoClient', () => ({
  getSsoToken: () => TOKEN,
}));

import { moduleFetch, resolveServerBase } from './api';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveServerBase', () => {
  it('uses the connected ccxt-server provider url', () => {
    expect(resolveServerBase()).toBe(SERVER_URL);
  });
});

describe('moduleFetch — same-origin requests', () => {
  it('resolves a server-relative path against the base and attaches the Bearer token', async () => {
    await moduleFetch('/api/modules');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SERVER_URL}/api/modules`);
    expect((init.headers as Headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('accepts an absolute url on the terminal server origin', async () => {
    await moduleFetch(`${SERVER_URL}/api/modules/arbitrage/scan`);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${SERVER_URL}/api/modules/arbitrage/scan`);
  });

  it('does not overwrite an Authorization header the caller already set', async () => {
    await moduleFetch('/api/modules', { headers: { Authorization: 'Bearer caller-supplied' } });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer caller-supplied');
  });
});

describe('moduleFetch — cross-origin requests are refused', () => {
  // Each of these would leak the terminal Bearer token if the origin check
  // regressed. The token must never reach any of them, so we assert that fetch
  // is not called at all rather than merely that the header is absent.
  const hostile = [
    ['a different host', 'https://evil.example/collect'],
    ['a host that merely prefixes the server name', 'https://terminal.example.com.evil.test/x'],
    ['a subdomain of the server', 'https://api.terminal.example.com/x'],
    ['a different port', 'https://terminal.example.com:8443/api/modules'],
    ['a different scheme', 'http://terminal.example.com/api/modules'],
  ] as const;

  it.each(hostile)('rejects %s and never calls fetch', async (_label, url) => {
    await expect(moduleFetch(url)).rejects.toThrow(/refusing to send an authenticated request/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects rather than throwing synchronously, so callers can .catch()', () => {
    const result = moduleFetch('https://evil.example/collect');
    expect(result).toBeInstanceOf(Promise);
    return expect(result).rejects.toBeInstanceOf(Error);
  });
});
