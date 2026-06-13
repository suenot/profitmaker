import { create } from 'zustand';

/**
 * Multi-login session manager for the MarketMaker ecosystem (auth.marketmaker.cc).
 *
 * The terminal can hold N simultaneous ecosystem-user sessions (N JWTs), one of
 * which is active. `getSsoToken()` returns the ACTIVE session's token, so every
 * downstream consumer that reads it (syncBridge, modules/api, ccxtServerProvider,
 * the /api/accounts proxy) follows the active identity automatically.
 *
 * Sessions persist in localStorage under `profitmaker.sso.sessions`. "Add login"
 * captures a freshly returned token as a NEW session without clobbering the
 * others; quick-switch sets the active one; an expired JWT (24h, no refresh
 * today) is flagged `stale` so the UI can prompt a re-login for that identity.
 *
 * Backward compatibility: the legacy single-token key `profitmaker.sso.token` is
 * migrated into a session on first load (see `loadSessions`).
 */

const SESSIONS_KEY = 'profitmaker.sso.sessions';
const LEGACY_TOKEN_KEY = 'profitmaker.sso.token';

export interface SsoUser {
  userId: string;
  email: string;
  username: string | null;
  roles: Record<string, string>;
}

export interface SsoSession {
  /** Stable local id for this session (the ecosystem user id when known). */
  id: string;
  token: string;
  user: SsoUser;
  /** epoch ms when this session was added/last refreshed. */
  addedAt: number;
  /** JWT `exp` in epoch ms, if decodable. */
  expiresAt?: number;
}

interface SessionState {
  sessions: SsoSession[];
  activeSessionId: string | null;
}

interface PersistedShape {
  sessions: SsoSession[];
  activeSessionId: string | null;
}

/** Decode a JWT payload without verifying (we only read `sub`/`exp`/`email`). */
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Best-effort `exp` (epoch ms) from a JWT, or undefined when absent. */
function jwtExpiresAt(token: string): number | undefined {
  const payload = decodeJwt(token);
  if (payload && typeof payload.exp === 'number') return payload.exp * 1000;
  return undefined;
}

/** A session is stale once its JWT `exp` has passed (no refresh flow today). */
export function isSessionStale(session: SsoSession): boolean {
  return typeof session.expiresAt === 'number' && session.expiresAt <= Date.now();
}

function readPersisted(): PersistedShape | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || !Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: SessionState): void {
  if (typeof localStorage === 'undefined') return;
  const shape: PersistedShape = {
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
  };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(shape));
}

/**
 * Migrate the legacy single-token key into a session, returning a session array.
 * Returns [] when there's nothing to migrate.
 */
function migrateLegacyToken(): SsoSession[] {
  if (typeof localStorage === 'undefined') return [];
  const token = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!token) return [];
  const payload = decodeJwt(token);
  const userId = (payload?.sub as string) || 'legacy';
  const session: SsoSession = {
    id: userId,
    token,
    user: {
      userId,
      email: (payload?.email as string) || '',
      username: (payload?.username as string) ?? null,
      roles: (payload?.services as Record<string, string>) || {},
    },
    addedAt: Date.now(),
    expiresAt: jwtExpiresAt(token),
  };
  // Leave the legacy key in place for a release as a safety net for older tabs;
  // sessionManager is now the source of truth.
  return [session];
}

/** Load persisted sessions, migrating the legacy single token on first run. */
function loadSessions(): SessionState {
  const persisted = readPersisted();
  if (persisted) {
    return {
      sessions: persisted.sessions,
      activeSessionId: persisted.activeSessionId,
    };
  }
  const migrated = migrateLegacyToken();
  const state: SessionState = {
    sessions: migrated,
    activeSessionId: migrated[0]?.id ?? null,
  };
  if (migrated.length) persist(state);
  return state;
}

export const useSessionStore = create<SessionState>(() => loadSessions());

/** The active session, or null when nobody is logged in. */
export function getActiveSession(): SsoSession | null {
  const { sessions, activeSessionId } = useSessionStore.getState();
  if (!activeSessionId) return sessions[0] ?? null;
  return sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
}

/**
 * The current SSO bearer token, if an active, non-stale session exists.
 * Read synchronously by token resolvers (ssoClient, ccxtServerProvider, api).
 */
export function getSsoToken(): string | undefined {
  const active = getActiveSession();
  if (!active) return undefined;
  if (isSessionStale(active)) return undefined;
  return active.token || undefined;
}

/** The active session's user, or null. */
export function getActiveUser(): SsoUser | null {
  return getActiveSession()?.user ?? null;
}

/**
 * Add or refresh a session from a freshly issued token. If a session for the
 * same ecosystem user already exists it's refreshed in place (and made active);
 * otherwise a new session is appended. Never clobbers other identities.
 */
export function upsertSession(token: string, user: SsoUser): SsoSession {
  const id = user.userId || (decodeJwt(token)?.sub as string) || `s_${Date.now()}`;
  const session: SsoSession = {
    id,
    token,
    user: { ...user, userId: id },
    addedAt: Date.now(),
    expiresAt: jwtExpiresAt(token),
  };
  useSessionStore.setState((state) => {
    const idx = state.sessions.findIndex((s) => s.id === id);
    const sessions =
      idx === -1
        ? [...state.sessions, session]
        : state.sessions.map((s, i) => (i === idx ? session : s));
    const next: SessionState = { sessions, activeSessionId: id };
    persist(next);
    return next;
  });
  return session;
}

/** Quick-switch the active identity. No-op for an unknown id. */
export function setActiveSession(id: string): void {
  useSessionStore.setState((state) => {
    if (!state.sessions.some((s) => s.id === id)) return state;
    const next: SessionState = { ...state, activeSessionId: id };
    persist(next);
    return next;
  });
}

/**
 * Remove a session (a single identity). Picks a new active session when the
 * removed one was active. Returns the removed session's token (so the caller can
 * best-effort revoke the shared cookie when removing the active identity).
 */
export function removeSession(id: string): SsoSession | undefined {
  let removed: SsoSession | undefined;
  useSessionStore.setState((state) => {
    removed = state.sessions.find((s) => s.id === id);
    const sessions = state.sessions.filter((s) => s.id !== id);
    const activeSessionId =
      state.activeSessionId === id ? sessions[0]?.id ?? null : state.activeSessionId;
    const next: SessionState = { sessions, activeSessionId };
    persist(next);
    return next;
  });
  return removed;
}

/** Drop every session (full sign-out across all identities). */
export function clearAllSessions(): void {
  const next: SessionState = { sessions: [], activeSessionId: null };
  useSessionStore.setState(next);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}
