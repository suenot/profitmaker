import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit tests for the central-accounts store (store/accountStore.ts). Network is
 * mocked at the moduleFetch seam (no real HTTP); the active SSO session is driven
 * through the real sessionManager. Asserts that list/add/remove/share hit the
 * right /api/accounts* endpoints, that NO secrets are kept client-side, and that
 * the userStore back-compat projection exposes the expected shape.
 */

// Mock the server-fetch seam. accountStore imports { moduleFetch } from
// '../modules/api'; we replace it so no real network (and so api.ts's heavy
// dependency graph — dataProviderStore etc. — isn't pulled in).
const moduleFetch = vi.fn();
vi.mock('../modules/api', () => ({
  moduleFetch: (...args: unknown[]) => moduleFetch(...args),
  resolveServerBase: () => 'http://localhost:3001',
  resolveServerToken: () => undefined,
}));

import { useAccountStore, buildUsers, initAccounts, type ExchangeAccount } from './accountStore';
import { useSessionStore, upsertSession } from '../services/sessionManager';

// --- helpers ---------------------------------------------------------------

function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
}

const futureExp = () => Math.floor((Date.now() + 24 * 3600 * 1000) / 1000);

/** A fetch Response-ish object that moduleFetch consumers use (ok/status/json). */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

function seedActiveSession(userId = 'u1') {
  upsertSession(fakeJwt({ sub: userId, exp: futureExp() }), {
    userId,
    email: `${userId}@example.com`,
    username: null,
    roles: {},
  });
}

const SERVER_ITEM: ExchangeAccount = {
  id: 'cred-1',
  exchange: 'binance',
  label: 'Main',
  read_only: false,
  has_ro_keys: false,
  owner_user_id: 'u1',
  access_level: 'trade',
  shared: false,
  created_at: '2026-06-13T00:00:00Z',
};

beforeEach(() => {
  moduleFetch.mockReset();
  // Reset the stores between tests.
  useSessionStore.setState({ sessions: [], activeSessionId: null });
  useAccountStore.setState({ accountsBySession: {}, loading: false, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadAccounts', () => {
  test('GETs /api/accounts and maps items into accountsBySession keyed by active session', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(jsonResponse([SERVER_ITEM]));

    await useAccountStore.getState().loadAccounts();

    expect(moduleFetch).toHaveBeenCalledWith('/api/accounts', { method: 'GET' });
    const state = useAccountStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.accountsBySession['u1']).toHaveLength(1);
    expect(state.accountsBySession['u1'][0]).toMatchObject({
      id: 'cred-1',
      exchange: 'binance',
      access_level: 'trade',
      shared: false,
    });
  });

  test('tolerates a {accounts:[...]} envelope as well as a bare array', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(jsonResponse({ accounts: [SERVER_ITEM] }));

    await useAccountStore.getState().loadAccounts();
    expect(useAccountStore.getState().accountsBySession['u1']).toHaveLength(1);
  });

  test('sets an error and does not throw on a non-ok response', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(jsonResponse({ error: 'boom' }, { ok: false, status: 500 }));

    await useAccountStore.getState().loadAccounts();
    expect(useAccountStore.getState().error).toBe('boom');
  });

  test('no-ops (no fetch) when there is no active session', async () => {
    await useAccountStore.getState().loadAccounts();
    expect(moduleFetch).not.toHaveBeenCalled();
  });
});

describe('addAccount', () => {
  test('POSTs snake_case keys to /api/accounts then re-GETs the list; stores NO secrets', async () => {
    seedActiveSession('u1');
    // 1st call: POST → short created shape; 2nd call: re-GET list.
    moduleFetch
      .mockResolvedValueOnce(jsonResponse({ id: 'cred-1', exchange: 'binance', label: 'Main', read_only: false }))
      .mockResolvedValueOnce(jsonResponse([SERVER_ITEM]));

    const created = await useAccountStore.getState().addAccount({
      exchange: 'binance',
      label: 'Main',
      api_key: 'KEY',
      api_secret: 'SECRET',
      passphrase: 'PASS',
    });

    // POST endpoint + method + body shape.
    const [postUrl, postInit] = moduleFetch.mock.calls[0];
    expect(postUrl).toBe('/api/accounts');
    expect(postInit.method).toBe('POST');
    const sentBody = JSON.parse(postInit.body);
    expect(sentBody).toMatchObject({ exchange: 'binance', api_key: 'KEY', api_secret: 'SECRET', passphrase: 'PASS' });
    // Re-GET happened.
    expect(moduleFetch.mock.calls[1]).toEqual(['/api/accounts', { method: 'GET' }]);

    expect(created).toMatchObject({ id: 'cred-1', exchange: 'binance' });

    // CRITICAL: no secret material is retained anywhere in the store state.
    const blob = JSON.stringify(useAccountStore.getState().accountsBySession);
    expect(blob).not.toContain('SECRET');
    expect(blob).not.toContain('KEY');
    expect(blob).not.toContain('PASS');
  });

  test('returns null and sets error on a non-ok POST', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(jsonResponse({ error: 'duplicate' }, { ok: false, status: 409 }));

    const created = await useAccountStore.getState().addAccount({
      exchange: 'binance',
      api_key: 'K',
      api_secret: 'S',
    });
    expect(created).toBeNull();
    expect(useAccountStore.getState().error).toBe('duplicate');
  });
});

describe('updateAccount', () => {
  test('PATCHes only submitted fields, re-GETs the list, and stores NO secrets', async () => {
    seedActiveSession('u1');
    const updatedItem = { ...SERVER_ITEM, label: 'Rotated', read_only: true };
    moduleFetch
      .mockResolvedValueOnce(jsonResponse(updatedItem))
      .mockResolvedValueOnce(jsonResponse([updatedItem]));

    const updated = await useAccountStore.getState().updateAccount('cred-1', {
      label: 'Rotated',
      read_only: true,
      api_key: 'NEW_KEY',
      api_secret: 'NEW_SECRET',
      passphrase: 'NEW_PASS',
    });

    const [patchUrl, patchInit] = moduleFetch.mock.calls[0];
    expect(patchUrl).toBe('/api/accounts/cred-1');
    expect(patchInit.method).toBe('PATCH');
    expect(JSON.parse(patchInit.body)).toEqual({
      label: 'Rotated',
      read_only: true,
      api_key: 'NEW_KEY',
      api_secret: 'NEW_SECRET',
      passphrase: 'NEW_PASS',
    });
    expect(moduleFetch.mock.calls[1]).toEqual(['/api/accounts', { method: 'GET' }]);
    expect(updated).toMatchObject({ id: 'cred-1', label: 'Rotated', read_only: true });

    const blob = JSON.stringify(useAccountStore.getState().accountsBySession);
    expect(blob).not.toContain('NEW_KEY');
    expect(blob).not.toContain('NEW_SECRET');
    expect(blob).not.toContain('NEW_PASS');
  });

  test('returns null, preserves the list, and sets error on a non-ok PATCH', async () => {
    seedActiveSession('u1');
    useAccountStore.setState({ accountsBySession: { u1: [SERVER_ITEM] } });
    moduleFetch.mockResolvedValueOnce(jsonResponse({ error: 'duplicate' }, { ok: false, status: 409 }));

    const updated = await useAccountStore.getState().updateAccount('cred-1', { label: 'duplicate' });

    expect(updated).toBeNull();
    expect(useAccountStore.getState().error).toBe('duplicate');
    expect(useAccountStore.getState().accountsBySession.u1).toEqual([SERVER_ITEM]);
    expect(moduleFetch).toHaveBeenCalledTimes(1);
  });
});

describe('removeAccount', () => {
  test('DELETEs /api/accounts/:id and drops it from the active session list', async () => {
    seedActiveSession('u1');
    useAccountStore.setState({ accountsBySession: { u1: [SERVER_ITEM] } });
    moduleFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const ok = await useAccountStore.getState().removeAccount('cred-1');
    expect(ok).toBe(true);
    expect(moduleFetch).toHaveBeenCalledWith('/api/accounts/cred-1', { method: 'DELETE' });
    expect(useAccountStore.getState().accountsBySession['u1']).toHaveLength(0);
  });
});

describe('sharing (grants)', () => {
  test('shareAccount POSTs { grantee_email, access_level } to /api/accounts/:id/grants', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(
      jsonResponse({ id: 'g1', grantee_email: 'bob@example.com', access_level: 'read' }, { status: 201 }),
    );

    const grant = await useAccountStore.getState().shareAccount('cred-1', 'bob@example.com', 'read');

    const [url, init] = moduleFetch.mock.calls[0];
    expect(url).toBe('/api/accounts/cred-1/grants');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ grantee_email: 'bob@example.com', access_level: 'read' });
    expect(grant).toMatchObject({ id: 'g1', access_level: 'read' });
  });

  test('listGrants GETs the grants endpoint and returns the array', async () => {
    seedActiveSession('u1');
    const grants = [{ id: 'g1', grantee_email: 'bob@example.com', access_level: 'trade' }];
    moduleFetch.mockResolvedValueOnce(jsonResponse(grants));

    const result = await useAccountStore.getState().listGrants('cred-1');
    expect(moduleFetch).toHaveBeenCalledWith('/api/accounts/cred-1/grants', { method: 'GET' });
    expect(result).toEqual(grants);
  });

  test('revokeGrant DELETEs the specific grant', async () => {
    seedActiveSession('u1');
    moduleFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const ok = await useAccountStore.getState().revokeGrant('cred-1', 'g1');
    expect(ok).toBe(true);
    expect(moduleFetch).toHaveBeenCalledWith('/api/accounts/cred-1/grants/g1', { method: 'DELETE' });
  });
});

describe('userStore back-compat projection (buildUsers)', () => {
  test('maps SSO sessions + loaded accounts into the legacy {users} shape', () => {
    const sessions = [
      { id: 'u1', token: 't1', addedAt: 1, user: { userId: 'u1', email: 'u1@example.com', username: 'u1name', roles: {} } },
      { id: 'u2', token: 't2', addedAt: 2, user: { userId: 'u2', email: 'u2@example.com', username: null, roles: {} } },
    ];
    const users = buildUsers(sessions as any, { u1: [SERVER_ITEM] });

    expect(users).toHaveLength(2);
    // identity shape the legacy consumers expect
    expect(users[0]).toMatchObject({ id: 'u1', email: 'u1@example.com', name: 'u1name' });
    expect(Array.isArray(users[0].accounts)).toBe(true);
    expect(users[0].accounts[0].id).toBe('cred-1');
    // identity with no loaded accounts yet → empty array, not undefined
    expect(users[1].accounts).toEqual([]);
  });
});

describe('initAccounts (regression: load on init for an already-active session)', () => {
  // initAccounts is window-guarded (browser-only); provide a window for the test.
  beforeEach(() => {
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = globalThis;
    }
  });
  afterEach(() => {
    if ((globalThis as any).window === globalThis) delete (globalThis as any).window;
  });

  test('loads the active identity accounts immediately (no session-CHANGE needed)', async () => {
    // The session is ALREADY active before init runs — exactly the reload case
    // where the change-only subscribe never fired and accounts stayed empty.
    seedActiveSession('u1');
    moduleFetch.mockResolvedValue(jsonResponse([SERVER_ITEM]));

    initAccounts();
    // initAccounts kicks off loadAccounts() async; let it settle.
    await vi.waitFor(() => {
      expect(useAccountStore.getState().accountsBySession['u1']).toBeDefined();
    });

    expect(moduleFetch).toHaveBeenCalledWith('/api/accounts', { method: 'GET' });
    expect(useAccountStore.getState().accountsBySession['u1']).toHaveLength(1);
  });

  test('does not re-fetch an identity whose accounts are already loaded', async () => {
    seedActiveSession('u1');
    useAccountStore.setState({ accountsBySession: { u1: [SERVER_ITEM] } });

    initAccounts();
    await new Promise((r) => setTimeout(r, 10));
    expect(moduleFetch).not.toHaveBeenCalled();
  });
});
