import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  install: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  upgrade: vi.fn(),
  uninstall: vi.fn(),
}));

vi.mock('../modules/manager', () => ({
  moduleManager: {
    apiVersion: '1.0.0',
    list: mocks.list,
    install: mocks.install,
    enable: mocks.enable,
    disable: mocks.disable,
    upgrade: mocks.upgrade,
    uninstall: mocks.uninstall,
  },
}));

const { moduleRoutes } = await import('./modules');
const { recordRequestIdentity } = await import('../modules/requestIdentity');
import type { RequestIdentity } from '../modules/requestIdentity';

const OPERATOR_TOKEN = 'test-modules-admin-token';

function ssoIdentity(roles: Record<string, string> | null): RequestIdentity {
  return { userId: 'u-1', authUserId: 'auth-1', roles };
}

/** Local session shape recorded by the auth gate — never carries roles. */
const localIdentity: RequestIdentity = { userId: 'u-1', authUserId: null, roles: null };

/**
 * Build the Request the auth gate would have seen and record the identity on
 * THAT object — the routes peek the WeakMap with the same Request Elysia hands
 * the handler, so identity must be recorded pre-handle (as authGate does).
 */
function moduleRequest(path: string, opts: { identity?: RequestIdentity } & RequestInit = {}): Request {
  const { identity, ...init } = opts;
  const request = new Request(`http://localhost${path}`, init);
  if (identity !== undefined) recordRequestIdentity(request, identity);
  return request;
}

async function install(opts: { identity?: RequestIdentity } & RequestInit = {}) {
  const { headers, ...rest } = opts;
  const response = await moduleRoutes.handle(
    moduleRequest('/api/modules/install', {
      ...rest,
      method: 'POST',
      // Merge (not replace) so a case's own headers keep the JSON content type.
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ name: 'demo-module' }),
    }),
  );
  return { status: response.status, body: await response.json() };
}

async function getList(opts: { identity?: RequestIdentity } & RequestInit = {}) {
  const response = await moduleRoutes.handle(moduleRequest('/api/modules', opts));
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Both env vars are read lazily inside the gate, so stubbing controls each
  // request. Empty string = unset as far as the `|| ''` reads are concerned;
  // MODULES_ADMIN_SERVICE falls back to the 'profitmaker' default.
  vi.stubEnv('MODULES_ADMIN_TOKEN', '');
  vi.stubEnv('MODULES_ADMIN_SERVICE', '');
  mocks.list.mockReturnValue([]);
  mocks.install.mockResolvedValue({ id: 'demo-module', enabled: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('module lifecycle gate — SSO admin role path', () => {
  it('admits an admin role for the default service with the operator token unset', async () => {
    const result = await install({ identity: ssoIdentity({ profitmaker: 'admin' }) });

    expect(result.status).toBe(200);
    expect(mocks.install).toHaveBeenCalledWith({ name: 'demo-module', version: undefined });
  });

  it('admits a superuser role with the operator token unset', async () => {
    const result = await install({ identity: ssoIdentity({ profitmaker: 'superuser' }) });

    expect(result.status).toBe(200);
    expect(mocks.install).toHaveBeenCalledOnce();
  });

  it('denies a plain user role with 403 when the operator token is set', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({ identity: ssoIdentity({ profitmaker: 'user' }) });

    expect(result).toEqual({
      status: 403,
      body: {
        error: 'operator credential required',
        details:
          'module install/upgrade/uninstall requires a valid x-modules-admin-token header or an admin role',
      },
    });
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it('denies a plain user role with 503 when no management path is configured', async () => {
    const result = await install({ identity: ssoIdentity({ profitmaker: 'user' }) });

    expect(result.status).toBe(503);
    expect(result.body.error).toBe('module management disabled');
    // The 503 names BOTH ways in: the admin role for the service, or the token.
    expect(result.body.details).toContain('profitmaker');
    expect(result.body.details).toContain('MODULES_ADMIN_TOKEN');
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it('denies an admin role granted for a different service', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({ identity: ssoIdentity({ 'other-service': 'admin' }) });

    expect(result.status).toBe(403);
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it('denies a case-variant role (exact, case-sensitive match)', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({ identity: ssoIdentity({ profitmaker: 'Admin' }) });

    expect(result.status).toBe(403);
    expect(mocks.install).not.toHaveBeenCalled();
  });
});

describe('module lifecycle gate — operator token fallback', () => {
  it('admits a local session (roles null) presenting the operator token', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({
      identity: localIdentity,
      headers: { 'x-modules-admin-token': OPERATOR_TOKEN },
    });

    expect(result.status).toBe(200);
    expect(mocks.install).toHaveBeenCalledOnce();
  });

  it('admits a caller with no recorded identity presenting the operator token (API_TOKEN)', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({ headers: { 'x-modules-admin-token': OPERATOR_TOKEN } });

    expect(result.status).toBe(200);
    expect(mocks.install).toHaveBeenCalledOnce();
  });

  it('returns 403 when no identity and the header is missing', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install();

    expect(result.status).toBe(403);
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it('returns 403 when the presented header does not match the configured token', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    const result = await install({ headers: { 'x-modules-admin-token': 'wrong-token' } });

    expect(result.status).toBe(403);
    expect(mocks.install).not.toHaveBeenCalled();
  });

  it('returns 503 with no identity when nothing is configured', async () => {
    const result = await install();

    expect(result.status).toBe(503);
    expect(result.body.error).toBe('module management disabled');
  });
});

describe('module lifecycle gate — every route is gated', () => {
  // Pins the swap at all five call sites: with a plain user role and a
  // configured token, every lifecycle route denies without touching the
  // manager; with an admin role and NO token, every one passes.
  const routes: Array<{ path: string; init: RequestInit }> = [
    {
      path: '/api/modules/install',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'demo-module' }),
      },
    },
    { path: '/api/modules/demo-module/enable', init: { method: 'POST' } },
    { path: '/api/modules/demo-module/disable', init: { method: 'POST' } },
    { path: '/api/modules/demo-module/upgrade', init: { method: 'POST' } },
    { path: '/api/modules/demo-module', init: { method: 'DELETE' } },
  ];

  it('denies a plain user on every lifecycle route', async () => {
    vi.stubEnv('MODULES_ADMIN_TOKEN', OPERATOR_TOKEN);

    for (const { path, init } of routes) {
      const response = await moduleRoutes.handle(
        moduleRequest(path, { ...init, identity: ssoIdentity({ profitmaker: 'user' }) }),
      );
      expect(response.status, path).toBe(403);
    }
    for (const fn of [mocks.install, mocks.enable, mocks.disable, mocks.upgrade, mocks.uninstall]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('admits an admin role on every lifecycle route with the token unset', async () => {
    mocks.enable.mockResolvedValue({ id: 'demo-module', enabled: true });
    mocks.disable.mockResolvedValue({ id: 'demo-module', enabled: false });
    mocks.upgrade.mockResolvedValue({ id: 'demo-module', version: '2.0.0' });
    mocks.uninstall.mockResolvedValue({ id: 'demo-module', pendingRestart: false });

    for (const { path, init } of routes) {
      const response = await moduleRoutes.handle(
        moduleRequest(path, { ...init, identity: ssoIdentity({ profitmaker: 'admin' }) }),
      );
      expect(response.status, path).toBe(200);
    }
    expect(mocks.install).toHaveBeenCalledOnce();
    expect(mocks.enable).toHaveBeenCalledOnce();
    expect(mocks.disable).toHaveBeenCalledOnce();
    expect(mocks.upgrade).toHaveBeenCalledOnce();
    expect(mocks.uninstall).toHaveBeenCalledOnce();
  });
});

describe('GET /api/modules — viewer.canManage', () => {
  it('reports canManage true for an SSO admin', async () => {
    const result = await getList({ identity: ssoIdentity({ profitmaker: 'admin' }) });

    expect(result.status).toBe(200);
    expect(result.body.viewer).toEqual({ canManage: true });
  });

  it('reports canManage false for a local session (roles null)', async () => {
    const result = await getList({ identity: localIdentity });

    expect(result.status).toBe(200);
    expect(result.body.viewer).toEqual({ canManage: false });
  });

  it('reports canManage false when no identity is recorded (API_TOKEN caller)', async () => {
    const result = await getList();

    expect(result.status).toBe(200);
    expect(result.body.viewer).toEqual({ canManage: false });
  });
});
