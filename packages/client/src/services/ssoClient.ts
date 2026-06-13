import {
  useSessionStore,
  getActiveSession,
  getActiveUser,
  getSsoToken as getSessionToken,
  upsertSession,
  setActiveSession,
  removeSession,
  clearAllSessions,
  isSessionStale,
  type SsoUser,
  type SsoSession,
} from './sessionManager';

/**
 * SSO client for the MarketMaker ecosystem (auth.marketmaker.cc).
 *
 * profitmaker runs at app.marketmaker.cc, a *.marketmaker.cc subdomain, so it
 * shares the `mm_session` cookie. On load we silently bootstrap a session by
 * calling `/api/v1/auth/session` with credentials — if the cookie is valid the
 * auth service returns a fresh JWT, which we capture as a session (held in the
 * multi-login sessionManager + localStorage) and present as the Bearer token to
 * our own server. Login is a top-level redirect to the auth service (the cookie
 * comes back); logout clears the active identity.
 *
 * Multi-login: the terminal holds N ecosystem-user sessions, one active. This
 * module is a thin façade over `sessionManager` — `getSsoToken()` returns the
 * ACTIVE session's token, and `bootstrap()` upserts the cookie's session
 * (append-if-new, refresh-if-existing) so "Add login" never clobbers others.
 *
 * Everything degrades gracefully: with no auth service reachable or no cookie,
 * the terminal stays in its existing API_TOKEN / dev-token modes.
 */

const AUTH_URL = ((import.meta.env.VITE_AUTH_URL as string | undefined) || 'https://auth.marketmaker.cc').replace(/\/$/, '');

export type { SsoUser, SsoSession };

interface SsoSessionResponse {
  token: string;
  user_id: string;
  email: string;
  username?: string;
  services?: Record<string, string>;
  roles?: Record<string, string>;
}

/**
 * Derived SSO view for existing single-session consumers (SsoUserChip's compact
 * mode, etc.). `status` reflects the ACTIVE identity: 'authenticated' when a
 * non-stale active session exists, 'unauthenticated' once an explicit logout /
 * 401 cleared it, else 'unknown' (e.g. auth service unreachable on first load).
 */
interface SsoView {
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  user: SsoUser | null;
  token: string | null;
  sessions: SsoSession[];
  activeSessionId: string | null;
}

// Tracks whether we've ever resolved the cookie (to distinguish 'unknown' from
// a real 'unauthenticated'). Not persisted — resets each page load.
let resolvedOnce = false;

function deriveStatus(hasActive: boolean): SsoView['status'] {
  if (hasActive) return 'authenticated';
  return resolvedOnce ? 'unauthenticated' : 'unknown';
}

/**
 * SSO store hook. Subscribes to sessionManager and projects the active-session
 * view that legacy components expect, plus the full sessions list for the
 * multi-login switcher.
 */
export function useSsoStore(): SsoView {
  // `useSessionStore()` with no selector subscribes to the whole state — the
  // component re-renders on any session change (add/switch/remove).
  const sessionState = useSessionStore();
  const active = getActiveSession();
  const live = active && !isSessionStale(active) ? active : null;
  return {
    status: deriveStatus(!!live),
    user: live?.user ?? null,
    token: live?.token ?? null,
    sessions: sessionState.sessions,
    activeSessionId: sessionState.activeSessionId,
  };
}

/** The current SSO bearer token, if authenticated. Read synchronously by token resolvers. */
export function getSsoToken(): string | undefined {
  return getSessionToken();
}

/** The active SSO user, or null. */
export function getCurrentUser(): SsoUser | null {
  return getActiveUser();
}

function toUser(resp: SsoSessionResponse): SsoUser {
  return {
    userId: resp.user_id,
    email: resp.email,
    username: resp.username ?? null,
    roles: resp.roles || resp.services || {},
  };
}

/**
 * Silent bootstrap: ask the auth service for a session using the shared cookie.
 * 200 → upsert the fresh JWT as a session (append-if-new identity, refresh if it
 * already exists) and make it active; 401 → mark unauthenticated (but keep other
 * cached sessions — only the cookie-bound identity is gone). Network failure
 * leaves status 'unknown' (so we don't wrongly show a login button when the auth
 * service is merely unreachable) and keeps any cached sessions.
 */
export async function bootstrap(): Promise<void> {
  try {
    const res = await fetch(`${AUTH_URL}/api/v1/auth/session`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = (await res.json()) as SsoSessionResponse;
      if (data?.token) {
        resolvedOnce = true;
        upsertSession(data.token, toUser(data));
        return;
      }
    }
    if (res.status === 401) {
      resolvedOnce = true;
      return;
    }
  } catch {
    // Auth service unreachable — keep any cached sessions, stay 'unknown'.
  }
}

/**
 * Build the auth login URL with the return param, optionally forcing a fresh
 * credential prompt via `?prompt=login`. Without it, auth auto-returns an
 * already-signed-in user with their CURRENT identity (which is what the first
 * login wants); with it, auth re-prompts so a DIFFERENT identity can be added.
 */
function authLoginUrl(forcePrompt: boolean): string {
  const ret = encodeURIComponent(window.location.href);
  const prompt = forcePrompt ? 'prompt=login&' : '';
  return `${AUTH_URL}/login?${prompt}return=${ret}`;
}

/**
 * Redirect the top-level window to the auth login page (normal flow), returning
 * here after. On return, `bootstrap()` upserts whichever identity the cookie now
 * represents. Used for the FIRST login — no `prompt=login`, so an already-valid
 * cookie signs the user straight back in.
 */
export function login(): void {
  window.location.href = authLoginUrl(false);
}

/**
 * "Add login" for multi-login: redirect to auth WITH `?prompt=login` so an
 * already-signed-in user is forced to enter credentials for a DIFFERENT
 * identity instead of being auto-returned with the current one. On return,
 * `bootstrap()` appends the new identity as a session without clobbering the
 * existing ones. (Requires auth's force-relogin support at /login?prompt=login.)
 */
export function addLogin(): void {
  window.location.href = authLoginUrl(true);
}

/** Quick-switch the active identity. */
export function switchSession(id: string): void {
  setActiveSession(id);
}

/** Remove a single identity from the terminal (local only). */
export function dropSession(id: string): void {
  removeSession(id);
}

/**
 * Clear the shared cookie and the ACTIVE local session, then fall back to the
 * next session if any remain. With one session this is a full logout; with
 * several it signs out just the active identity.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${AUTH_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort; clear locally regardless
  }
  const active = getActiveSession();
  resolvedOnce = true;
  if (active) {
    removeSession(active.id);
  } else {
    clearAllSessions();
  }
}

/** Sign out of every identity at once. */
export async function logoutAll(): Promise<void> {
  try {
    await fetch(`${AUTH_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort
  }
  resolvedOnce = true;
  clearAllSessions();
}
