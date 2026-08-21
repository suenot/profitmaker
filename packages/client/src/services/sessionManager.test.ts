import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit tests for the multi-login session manager (services/sessionManager.ts).
 * Fully mocked, no network. localStorage is faked; sessions are driven through
 * the public API. `loadSessions()` runs at module import, so scenarios that
 * depend on the initial localStorage state (legacy-token migration, persistence
 * round-trip on load) reset the module registry and re-import a fresh instance.
 */

// --- test helpers ----------------------------------------------------------

/** Minimal in-memory localStorage that satisfies the code's usage. */
function makeLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

/**
 * Build a fake (unsigned) JWT whose payload decodes to the given claims. The
 * session manager only base64-decodes the payload segment (no signature check),
 * so a `header.payload.sig` string with a real base64 payload is enough.
 */
function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.sig`;
}

const SESSIONS_KEY = 'profitmaker.sso.sessions';
const LEGACY_TOKEN_KEY = 'profitmaker.sso.token';

const HOUR = 3600 * 1000;
const futureExpSec = () => Math.floor((Date.now() + 24 * HOUR) / 1000);
const pastExpSec = () => Math.floor((Date.now() - HOUR) / 1000);

const user = (over: Partial<{ userId: string; email: string; username: string | null }> = {}) => ({
  userId: over.userId ?? 'u1',
  email: over.email ?? 'u1@example.com',
  username: over.username ?? null,
  roles: {},
});

let store: Storage;

beforeEach(() => {
  store = makeLocalStorage();
  vi.stubGlobal('localStorage', store);
  vi.resetModules(); // force loadSessions() to re-run on next import
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Import a fresh module instance (after localStorage is seeded for the scenario). */
async function freshModule() {
  return import('./sessionManager');
}

describe('upsertSession', () => {
  test('appends a new identity and makes it active', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2', email: 'u2@example.com' }));

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions.map((s) => s.id)).toEqual(['u1', 'u2']);
    expect(activeSessionId).toBe('u2'); // the newly added one is active
    expect(sm.getActiveSession()?.id).toBe('u2');
  });

  test('refreshes an existing identity in place (keyed by user id) without duplicating', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2', email: 'u2@example.com' }));
    // Re-issue u1 with a new token — should replace in place, not append.
    const newToken = fakeJwt({ sub: 'u1', exp: futureExpSec() });
    sm.upsertSession(newToken, user({ userId: 'u1' }));

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions.map((s) => s.id)).toEqual(['u1', 'u2']); // still 2, no dupes
    expect(sessions.find((s) => s.id === 'u1')!.token).toBe(newToken);
    expect(activeSessionId).toBe('u1'); // refreshed identity becomes active
  });

  test('derives the session id from the JWT sub when user.userId is empty', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'sub-xyz', exp: futureExpSec() }), user({ userId: '' }));
    expect(sm.useSessionStore.getState().sessions[0].id).toBe('sub-xyz');
  });
});

describe('upsertSession — background refresh ({ activate: false })', () => {
  test('refreshing a NON-active identity keeps the current selection active', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2', email: 'u2@example.com' }));
    sm.setActiveSession('u1');

    // Cookie-bound background refresh of u2 must not steal activation from u1
    // (bug: page reload snapped back to the cookie's identity).
    const newToken = fakeJwt({ sub: 'u2', exp: futureExpSec() });
    sm.upsertSession(newToken, user({ userId: 'u2', email: 'u2@example.com' }), { activate: false });

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions.find((s) => s.id === 'u2')!.token).toBe(newToken); // refreshed in place
    expect(activeSessionId).toBe('u1'); // selection preserved
  });

  test('appending a brand-new identity does not steal activation either', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));

    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }), { activate: false });

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions.map((s) => s.id)).toEqual(['u1', 'u2']);
    expect(activeSessionId).toBe('u1');
  });

  test('with no usable selection it still activates the resolved identity', async () => {
    const sm = await freshModule();
    // No sessions yet → nothing to preserve; the resolved identity becomes active.
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }), { activate: false });
    expect(sm.useSessionStore.getState().activeSessionId).toBe('u1');
  });

  test('a dangling selection (points at a removed session) falls back to the resolved identity', async () => {
    store.setItem(
      SESSIONS_KEY,
      JSON.stringify({
        sessions: [
          { id: 'u1', token: fakeJwt({ sub: 'u1', exp: futureExpSec() }), user: user({ userId: 'u1' }), addedAt: Date.now() },
        ],
        activeSessionId: 'ghost',
      }),
    );
    const sm = await freshModule();

    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }), { activate: false });

    expect(sm.useSessionStore.getState().activeSessionId).toBe('u2');
  });
});

describe('getSsoToken', () => {
  test("returns the ACTIVE session's token", async () => {
    const sm = await freshModule();
    const t1 = fakeJwt({ sub: 'u1', exp: futureExpSec() });
    const t2 = fakeJwt({ sub: 'u2', exp: futureExpSec() });
    sm.upsertSession(t1, user({ userId: 'u1' }));
    sm.upsertSession(t2, user({ userId: 'u2' }));
    expect(sm.getSsoToken()).toBe(t2); // u2 active

    sm.setActiveSession('u1');
    expect(sm.getSsoToken()).toBe(t1); // follows the active switch
  });

  test('returns undefined when the active session is stale (JWT exp in the past)', async () => {
    const sm = await freshModule();
    const stale = fakeJwt({ sub: 'u1', exp: pastExpSec() });
    sm.upsertSession(stale, user({ userId: 'u1' }));
    expect(sm.isSessionStale(sm.getActiveSession()!)).toBe(true);
    expect(sm.getSsoToken()).toBeUndefined();
  });

  test('returns undefined when there is no session', async () => {
    const sm = await freshModule();
    expect(sm.getSsoToken()).toBeUndefined();
    expect(sm.getActiveSession()).toBeNull();
  });
});

describe('isSessionStale — tokens without a readable `exp`', () => {
  /**
   * Seed a persisted session directly so `addedAt`/`expiresAt` can be set to
   * values `upsertSession` would never produce (it always stamps Date.now()).
   */
  const seedSession = (over: Record<string, unknown>) => {
    store.setItem(
      SESSIONS_KEY,
      JSON.stringify({
        sessions: [
          { id: 'u1', token: 'tok', user: user({ userId: 'u1' }), addedAt: Date.now(), ...over },
        ],
        activeSessionId: 'u1',
      }),
    );
  };

  test('a token with no `exp` is clamped to addedAt + 24h, not rejected outright', async () => {
    // Added just now, no exp → still inside the fallback window.
    seedSession({ addedAt: Date.now() - HOUR, expiresAt: undefined });
    const sm = await freshModule();
    expect(sm.isSessionStale(sm.getActiveSession()!)).toBe(false);
    expect(sm.getSsoToken()).toBe('tok');
  });

  test('a token with no `exp` goes stale once 24h have passed since addedAt', async () => {
    seedSession({ addedAt: Date.now() - 25 * HOUR, expiresAt: undefined });
    const sm = await freshModule();
    expect(sm.isSessionStale(sm.getActiveSession()!)).toBe(true);
    expect(sm.getSsoToken()).toBeUndefined();
  });

  test('a malformed `expiresAt` fails closed (corruption, not an auth-service variation)', async () => {
    seedSession({ expiresAt: 'not-a-number' });
    const sm = await freshModule();
    expect(sm.isSessionStale(sm.getActiveSession()!)).toBe(true);
    expect(sm.getSsoToken()).toBeUndefined();
  });

  test('a corrupt `addedAt` fails closed rather than clamping to NaN', async () => {
    // NaN deadlines make every comparison false — that would resurrect the
    // immortal-token bug the clamp exists to prevent.
    seedSession({ addedAt: 'garbage', expiresAt: undefined });
    const sm = await freshModule();
    expect(sm.isSessionStale(sm.getActiveSession()!)).toBe(true);
    expect(sm.getSsoToken()).toBeUndefined();
  });
});

describe('setActiveSession', () => {
  test('switches the active identity; ignores unknown ids', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }));

    sm.setActiveSession('u1');
    expect(sm.useSessionStore.getState().activeSessionId).toBe('u1');

    sm.setActiveSession('does-not-exist');
    expect(sm.useSessionStore.getState().activeSessionId).toBe('u1'); // unchanged
  });
});

describe('removeSession', () => {
  test('removes a session and picks a new active when the active one was removed', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }));
    // u2 is active; remove it.
    const removed = sm.removeSession('u2');
    expect(removed?.id).toBe('u2');

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions.map((s) => s.id)).toEqual(['u1']);
    expect(activeSessionId).toBe('u1'); // fell back to the remaining session
  });

  test('removing a non-active session leaves the active one intact', async () => {
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }));
    sm.setActiveSession('u2');

    sm.removeSession('u1');
    expect(sm.useSessionStore.getState().activeSessionId).toBe('u2');
  });
});

describe('legacy token migration', () => {
  test('migrates profitmaker.sso.token into a session on first load', async () => {
    const legacy = fakeJwt({ sub: 'legacy-user', email: 'legacy@example.com', exp: futureExpSec() });
    store.setItem(LEGACY_TOKEN_KEY, legacy); // seed BEFORE import
    const sm = await freshModule();

    const { sessions, activeSessionId } = sm.useSessionStore.getState();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('legacy-user');
    expect(sessions[0].token).toBe(legacy);
    expect(sessions[0].user.email).toBe('legacy@example.com');
    expect(activeSessionId).toBe('legacy-user');
    expect(sm.getSsoToken()).toBe(legacy);
    // Migration is persisted to the new key.
    expect(store.getItem(SESSIONS_KEY)).toBeTruthy();
  });

  test('no migration when no legacy token exists', async () => {
    const sm = await freshModule();
    expect(sm.useSessionStore.getState().sessions).toHaveLength(0);
  });
});

describe('localStorage persistence round-trip', () => {
  test('upserted sessions persist and are restored on a fresh load', async () => {
    // First module instance: add two sessions.
    const sm1 = await freshModule();
    sm1.upsertSession(fakeJwt({ sub: 'u1', exp: futureExpSec() }), user({ userId: 'u1' }));
    sm1.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }));
    sm1.setActiveSession('u1');

    // The same localStorage persists; re-import a fresh module → loadSessions()
    // should restore from the persisted blob (NOT re-run legacy migration).
    vi.resetModules();
    const sm2 = await import('./sessionManager');
    const { sessions, activeSessionId } = sm2.useSessionStore.getState();
    expect(sessions.map((s) => s.id)).toEqual(['u1', 'u2']);
    expect(activeSessionId).toBe('u1');
  });

  test('clearAllSessions wipes state and both localStorage keys', async () => {
    store.setItem(LEGACY_TOKEN_KEY, fakeJwt({ sub: 'u1', exp: futureExpSec() }));
    const sm = await freshModule();
    sm.upsertSession(fakeJwt({ sub: 'u2', exp: futureExpSec() }), user({ userId: 'u2' }));

    sm.clearAllSessions();
    expect(sm.useSessionStore.getState().sessions).toHaveLength(0);
    expect(sm.useSessionStore.getState().activeSessionId).toBeNull();
    expect(store.getItem(SESSIONS_KEY)).toBeNull();
    expect(store.getItem(LEGACY_TOKEN_KEY)).toBeNull();
  });
});
