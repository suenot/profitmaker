import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for /api/accounts/* — the auth user-plane proxy. Collaborators are
 * mocked: getSsoContextFromRequest (SSO gate) and proxyMeExchanges (the actual
 * forward to auth). We assert the routes require SSO, forward the caller bearer,
 * map to the right subPath/method, and pass auth's status+body straight through.
 */

const ssoMock = vi.fn();
vi.mock('../middleware/requireUser', () => ({
  getSsoContextFromRequest: (req: Request) => ssoMock(req),
  getBearerToken: () => null,
  getUserFromRequest: async () => null,
}));

const proxyMock = vi.fn();
const invalidateMock = vi.fn();
vi.mock('../services/authAccounts', () => ({
  proxyMeExchanges: (args: unknown) => proxyMock(args),
  invalidateCredentialCache: (accountId: string) => invalidateMock(accountId),
}));

const { accountRoutes } = await import('./accounts');

async function call(method: string, path: string, body?: unknown, auth = 'Bearer test') {
  const res = await accountRoutes.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

beforeEach(() => {
  vi.clearAllMocks();
  ssoMock.mockResolvedValue({ ssoUserId: 'sso-1', bearer: 'JWT_CALLER' });
  proxyMock.mockResolvedValue({ status: 200, body: [] });
});

describe('SSO gate', () => {
  it('returns 401 when there is no SSO identity', async () => {
    ssoMock.mockResolvedValue(null);
    const { status, json } = await call('GET', '/api/accounts');
    expect(status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('SSO') });
    expect(proxyMock).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/accounts/:id', () => {
  it('forwards a partial update and invalidates cached credentials on success', async () => {
    const body = { label: 'main', read_only: true, api_key: 'K2', api_secret: 'S2' };
    proxyMock.mockResolvedValue({ status: 200, body: { id: 'cred-1', exchange: 'bingx', ...body } });

    const { status, json } = await call('PATCH', '/api/accounts/cred-1', body);

    expect(status).toBe(200);
    expect(json).toMatchObject({ id: 'cred-1', label: 'main', read_only: true });
    expect(proxyMock).toHaveBeenCalledWith({
      bearer: 'JWT_CALLER', method: 'PATCH', subPath: '/cred-1', body,
    });
    expect(invalidateMock).toHaveBeenCalledWith('cred-1');
  });

  it('does not invalidate cached credentials when auth rejects the update', async () => {
    proxyMock.mockResolvedValue({ status: 409, body: { error: 'duplicate' } });

    const { status } = await call('PATCH', '/api/accounts/cred-1', { label: 'duplicate' });

    expect(status).toBe(409);
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/accounts', () => {
  it('forwards the caller bearer with method GET and passes the list through', async () => {
    proxyMock.mockResolvedValue({ status: 200, body: [{ id: 'a1', exchange: 'bingx' }] });
    const { status, json } = await call('GET', '/api/accounts');
    expect(status).toBe(200);
    expect(json).toEqual([{ id: 'a1', exchange: 'bingx' }]);
    expect(proxyMock).toHaveBeenCalledWith({ bearer: 'JWT_CALLER', method: 'GET' });
  });
});

describe('POST /api/accounts', () => {
  it('forwards the create body and relays auth status 201', async () => {
    proxyMock.mockResolvedValue({ status: 201, body: { id: 'a2', exchange: 'bingx', label: 'trender', read_only: false } });
    const { status, json } = await call('POST', '/api/accounts', {
      exchange: 'bingx', label: 'trender', api_key: 'K', api_secret: 'S',
    });
    expect(status).toBe(201);
    expect(json).toMatchObject({ id: 'a2', exchange: 'bingx' });
    expect(proxyMock).toHaveBeenCalledWith({
      bearer: 'JWT_CALLER', method: 'POST',
      body: { exchange: 'bingx', label: 'trender', api_key: 'K', api_secret: 'S' },
    });
  });

  it('relays a 409 conflict from auth', async () => {
    proxyMock.mockResolvedValue({ status: 409, body: { error: 'duplicate' } });
    const { status } = await call('POST', '/api/accounts', { exchange: 'bingx', api_key: 'K', api_secret: 'S' });
    expect(status).toBe(409);
  });
});

describe('DELETE /api/accounts/:id', () => {
  it('forwards with the id subPath', async () => {
    proxyMock.mockResolvedValue({ status: 200, body: { ok: true } });
    const { status } = await call('DELETE', '/api/accounts/cred-1');
    expect(status).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith({ bearer: 'JWT_CALLER', method: 'DELETE', subPath: '/cred-1' });
  });
});

describe('grants', () => {
  it('GET /:id/grants forwards to the grants subPath', async () => {
    proxyMock.mockResolvedValue({ status: 200, body: [{ id: 'g1', access_level: 'read' }] });
    const { status, json } = await call('GET', '/api/accounts/cred-1/grants');
    expect(status).toBe(200);
    expect(json).toEqual([{ id: 'g1', access_level: 'read' }]);
    expect(proxyMock).toHaveBeenCalledWith({ bearer: 'JWT_CALLER', method: 'GET', subPath: '/cred-1/grants' });
  });

  it('POST /:id/grants forwards the grant body', async () => {
    proxyMock.mockResolvedValue({ status: 201, body: { id: 'g2' } });
    const { status } = await call('POST', '/api/accounts/cred-1/grants', {
      grantee_email: 'x@y.z', access_level: 'trade',
    });
    expect(status).toBe(201);
    expect(proxyMock).toHaveBeenCalledWith({
      bearer: 'JWT_CALLER', method: 'POST', subPath: '/cred-1/grants',
      body: { grantee_email: 'x@y.z', access_level: 'trade' },
    });
  });

  it('DELETE /:id/grants/:grantId forwards the nested subPath', async () => {
    proxyMock.mockResolvedValue({ status: 200, body: { ok: true } });
    const { status } = await call('DELETE', '/api/accounts/cred-1/grants/g2');
    expect(status).toBe(200);
    expect(proxyMock).toHaveBeenCalledWith({ bearer: 'JWT_CALLER', method: 'DELETE', subPath: '/cred-1/grants/g2' });
  });
});
