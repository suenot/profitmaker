import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the root auth gate (the onBeforeHandle wired in src/index.ts).
 * Collaborators are mocked: validateSession (local sessions), getSsoUserFromToken
 * (SSO JWTs), matchesApiToken (server-to-server token). We assert the skip paths,
 * the 401/403 rejections, and — the point of the gate's identity minting — that
 * exactly the session/SSO paths record a RequestIdentity on the request.
 */

const validateSessionMock = vi.fn();
vi.mock('../services/auth', () => ({
  validateSession: (...args: unknown[]) => validateSessionMock(...args),
}));

const ssoMock = vi.fn();
vi.mock('../services/ssoAuth', () => ({
  getSsoUserFromToken: (...args: unknown[]) => ssoMock(...args),
}));

const apiTokenMock = vi.fn();
vi.mock('../services/apiToken', () => ({
  matchesApiToken: (...args: unknown[]) => apiTokenMock(...args),
}));

vi.mock('../db', () => ({ db: { tag: 'mock-db' } }));

const { authGate } = await import('./authGate');
const { peekRequestIdentity } = await import('../modules/requestIdentity');

/** Run the gate against a synthetic request; returns result + the request (to peek identity). */
async function gate(path: string, headers: Record<string, string> = {}) {
  const request = new Request(`http://localhost${path}`, { headers });
  const set: { status?: number | string } = {};
  const result = await authGate({ request, set });
  return { result, set, request };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiTokenMock.mockReturnValue(false);
  validateSessionMock.mockResolvedValue(null);
  ssoMock.mockResolvedValue(null);
});

describe('skip paths', () => {
  it('lets /health, /api/auth/*, and non-API paths through untouched', async () => {
    for (const path of ['/health', '/health/egress-ip', '/api/auth/login', '/', '/favicon.ico']) {
      const { result, set } = await gate(path);
      expect(result, path).toBeUndefined();
      expect(set.status, path).toBeUndefined();
    }
    expect(validateSessionMock).not.toHaveBeenCalled();
    expect(ssoMock).not.toHaveBeenCalled();
  });
});

describe('rejections', () => {
  it('returns 401 when no bearer token is presented', async () => {
    const { result, set, request } = await gate('/api/dashboards');
    expect(set.status).toBe(401);
    expect(result).toEqual({ error: 'Access token required' });
    expect(peekRequestIdentity(request)).toBeUndefined();
  });

  it('returns 403 for a token no resolver accepts', async () => {
    const { result, set, request } = await gate('/api/dashboards', {
      authorization: 'Bearer nope',
    });
    expect(set.status).toBe(403);
    expect(result).toEqual({ error: 'Invalid token' });
    expect(peekRequestIdentity(request)).toBeUndefined();
  });
});

describe('API_TOKEN (server-to-server)', () => {
  it('passes through but records no identity', async () => {
    apiTokenMock.mockReturnValue(true);
    const { result, set, request } = await gate('/api/dashboards', {
      authorization: 'Bearer srv-token',
    });
    expect(result).toBeUndefined();
    expect(set.status).toBeUndefined();
    expect(peekRequestIdentity(request)).toBeUndefined();
    expect(validateSessionMock).not.toHaveBeenCalled();
    expect(ssoMock).not.toHaveBeenCalled();
  });
});

describe('local session token', () => {
  it('passes through and records {userId, authUserId: null, roles: null}', async () => {
    validateSessionMock.mockResolvedValue({ id: 'u-1', email: 'a@b.c', name: null });
    const { result, set, request } = await gate('/api/dashboards', {
      authorization: 'Bearer session-token',
    });
    expect(result).toBeUndefined();
    expect(set.status).toBeUndefined();
    expect(validateSessionMock).toHaveBeenCalledWith(expect.anything(), 'session-token');
    // A local session has no auth-service roles — null, never absent.
    expect(peekRequestIdentity(request)).toEqual({ userId: 'u-1', authUserId: null, roles: null });
  });
});

describe('SSO JWT', () => {
  it('passes through and records {userId, authUserId, roles}', async () => {
    ssoMock.mockResolvedValue({
      authUserId: 'auth-1',
      id: 'u-2',
      email: 'x@y.z',
      name: 'X',
      roles: { profitmaker: 'admin' },
    });
    const { result, set, request } = await gate('/api/dashboards', {
      authorization: 'Bearer sso.jwt.token',
    });
    expect(result).toBeUndefined();
    expect(set.status).toBeUndefined();
    expect(peekRequestIdentity(request)).toEqual({
      userId: 'u-2',
      authUserId: 'auth-1',
      roles: { profitmaker: 'admin' },
    });
  });
});
