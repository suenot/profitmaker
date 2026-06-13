import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for authAccounts.ts — fully mocked, no network.
 *
 * authAccounts captures AUTH_INTERNAL_SECRET / AUTH_INTERNAL_URL / AUTH_URL at
 * MODULE LOAD time, so each test sets the env then dynamically imports a fresh
 * copy of the module (vi.resetModules) to exercise the intended configuration.
 * global fetch is stubbed per-test; secrets used here are dummy literals.
 */

type FetchResult = { status: number; ok?: boolean; body: unknown; nonJson?: string };

/** Build a Response-like stub matching what authAccounts reads (.ok/.status/.json/.text). */
function makeResponse(r: FetchResult): Response {
  const ok = r.ok ?? (r.status >= 200 && r.status < 300);
  return {
    ok,
    status: r.status,
    json: async () => {
      if (r.nonJson !== undefined) throw new SyntaxError('not json');
      return r.body;
    },
    text: async () => (r.nonJson !== undefined ? r.nonJson : JSON.stringify(r.body)),
  } as unknown as Response;
}

/** Import a fresh authAccounts with the given env applied at load time. */
async function importFresh(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import('./authAccounts');
}

const SECRET_ENV = {
  AUTH_INTERNAL_SECRET: 'unit-test-internal-secret',
  AUTH_INTERNAL_URL: 'https://auth.test',
  AUTH_URL: 'https://auth.test',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCredentials', () => {
  it('returns the decrypted credentials on a 200 trade response', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () =>
      makeResponse({
        status: 200,
        body: {
          api_key: 'KEY123',
          api_secret: 'SEC456',
          passphrase: 'PASS789',
          credential_id: 'cred-1',
          owner_user_id: 'owner-1',
          access_level: 'trade',
          read_only: false,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const creds = await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'trade' });

    expect(creds).toMatchObject({
      apiKey: 'KEY123',
      secret: 'SEC456',
      password: 'PASS789',
      accessLevel: 'trade',
      readOnly: false,
      credentialId: 'cred-1',
      ownerUserId: 'owner-1',
    });

    // It hit the internal endpoint with the X-Internal-Secret header and the
    // requester_user_id body — and never logged/exposed the secret in the URL.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://auth.test/api/v1/internal/exchange-credentials');
    expect((init.headers as Record<string, string>)['X-Internal-Secret']).toBe('unit-test-internal-secret');
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toMatchObject({ credential_id: 'cred-1', requester_user_id: 'u1', want: 'trade' });
  });

  it('throws a 403 AuthAccountsError when want=trade but auth returns read-only', async () => {
    const { fetchCredentials, AuthAccountsError } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () =>
      makeResponse({
        status: 403,
        body: { error: 'read-only grant', access_level: 'read', read_only: true },
      }),
    ));

    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'trade' }),
    ).rejects.toMatchObject({ status: 403 });

    // And the error is the typed class carrying the access decision.
    const err = await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'trade' }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthAccountsError);
    expect(err.accessLevel).toBe('read');
    expect(err.readOnly).toBe(true);
  });

  it('defense-in-depth: refuses trade keys when a 200 response is read-only', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    // Auth (incorrectly) returned 200 with a read-only access level for a trade
    // request — fetchCredentials must still refuse with 403, not hand back keys.
    vi.stubGlobal('fetch', vi.fn(async () =>
      makeResponse({
        status: 200,
        body: { api_key: 'K', api_secret: 'S', access_level: 'read', read_only: true },
      }),
    ));

    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'trade' }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('returns read keys for want=read (read access is sufficient)', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () =>
      makeResponse({
        status: 200,
        body: { api_key: 'ROK', api_secret: 'ROS', access_level: 'read', read_only: true },
      }),
    ));

    const creds = await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });
    expect(creds).toMatchObject({ apiKey: 'ROK', secret: 'ROS', accessLevel: 'read', readOnly: true });
  });

  it('maps a 404 to AuthAccountsError 404', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({ status: 404, body: { error: 'nope' } })));
    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'missing', want: 'read' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('maps a 401 (our secret wrong) to a 503 server-misconfig error', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({ status: 401, body: { error: 'bad secret' } })));
    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('throws 503 when AUTH_INTERNAL_SECRET is unconfigured (no fetch attempted)', async () => {
    const { fetchCredentials } = await importFresh({ ...SECRET_ENV, AUTH_INTERNAL_SECRET: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' }),
    ).rejects.toMatchObject({ status: 503 });
    // Must short-circuit before any network call.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws 503 when the auth service is unreachable (fetch rejects)', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('throws 502 when a 200 response is missing key material', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({ status: 200, body: { access_level: 'read' } })));
    await expect(
      fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('caches within the TTL: a second call does NOT refetch', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () =>
      makeResponse({ status: 200, body: { api_key: 'K', api_secret: 'S', access_level: 'read', read_only: true } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const a = await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });
    const b = await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1); // served from cache the 2nd time
  });

  it('cache key separates (ssoUserId, credentialId, want): different want refetches', async () => {
    const { fetchCredentials } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () =>
      makeResponse({ status: 200, body: { api_key: 'K', api_secret: 'S', access_level: 'trade', read_only: false } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });
    await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'trade' });
    await fetchCredentials({ ssoUserId: 'u2', credentialId: 'cred-1', want: 'read' });
    // Three distinct keys → three fetches.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clearCredentialCache forces a refetch', async () => {
    const { fetchCredentials, clearCredentialCache } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () =>
      makeResponse({ status: 200, body: { api_key: 'K', api_secret: 'S', access_level: 'read', read_only: true } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });
    clearCredentialCache();
    await fetchCredentials({ ssoUserId: 'u1', credentialId: 'cred-1', want: 'read' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('proxyMeExchanges', () => {
  it('forwards the caller bearer to auth /api/v1/me/exchanges and passes status+body through', async () => {
    const { proxyMeExchanges } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () =>
      makeResponse({ status: 200, body: [{ id: 'a1', exchange: 'bingx' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await proxyMeExchanges({ bearer: 'JWT_ABC', method: 'GET' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'a1', exchange: 'bingx' }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://auth.test/api/v1/me/exchanges');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer JWT_ABC');
    // The user plane must NEVER carry the internal secret.
    expect((init.headers as Record<string, string>)['X-Internal-Secret']).toBeUndefined();
  });

  it('appends subPath and serializes a JSON body on POST', async () => {
    const { proxyMeExchanges } = await importFresh(SECRET_ENV);
    const fetchMock = vi.fn(async () => makeResponse({ status: 201, body: { id: 'g1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await proxyMeExchanges({
      bearer: 'JWT', method: 'POST', subPath: '/cred-1/grants', body: { grantee_email: 'x@y.z', access_level: 'read' },
    });

    expect(res.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://auth.test/api/v1/me/exchanges/cred-1/grants');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ grantee_email: 'x@y.z', access_level: 'read' });
  });

  it('returns 503 when auth is unreachable', async () => {
    const { proxyMeExchanges } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const res = await proxyMeExchanges({ bearer: 'JWT', method: 'GET' });
    expect(res.status).toBe(503);
  });

  it('synthesizes an error body when auth returns non-JSON', async () => {
    const { proxyMeExchanges } = await importFresh(SECRET_ENV);
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({ status: 502, body: null, nonJson: '<html>err</html>' })));
    const res = await proxyMeExchanges({ bearer: 'JWT', method: 'GET' });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });
});
