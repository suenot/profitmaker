import { create } from 'zustand';

/**
 * SSO client for the MarketMaker ecosystem (auth.marketmaker.cc).
 *
 * profitmaker runs at app.marketmaker.cc, a *.marketmaker.cc subdomain, so it
 * shares the `mm_session` cookie. On load we silently bootstrap a session by
 * calling `/api/v1/auth/session` with credentials — if the cookie is valid the
 * auth service returns a fresh JWT, which we hold in memory + localStorage and
 * present as the Bearer token to our own server. Login is a top-level redirect
 * to the auth service (the cookie comes back); logout clears both sides.
 *
 * Everything degrades gracefully: with no auth service reachable or no cookie,
 * the terminal stays in its existing API_TOKEN / dev-token modes.
 */

const AUTH_URL = ((import.meta.env.VITE_AUTH_URL as string | undefined) || 'https://auth.marketmaker.cc').replace(/\/$/, '');
const TOKEN_KEY = 'profitmaker.sso.token';

export interface SsoUser {
  userId: string;
  email: string;
  username: string | null;
  roles: Record<string, string>;
}

interface SsoSessionResponse {
  token: string;
  user_id: string;
  email: string;
  username?: string;
  services?: Record<string, string>;
  roles?: Record<string, string>;
}

interface SsoState {
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  user: SsoUser | null;
  token: string | null;
}

export const useSsoStore = create<SsoState>(() => ({
  status: 'unknown',
  user: null,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
}));

/** The current SSO bearer token, if authenticated. Read synchronously by token resolvers. */
export function getSsoToken(): string | undefined {
  return useSsoStore.getState().token || undefined;
}

function setSession(resp: SsoSessionResponse): void {
  const user: SsoUser = {
    userId: resp.user_id,
    email: resp.email,
    username: resp.username ?? null,
    roles: resp.roles || resp.services || {},
  };
  if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, resp.token);
  useSsoStore.setState({ status: 'authenticated', user, token: resp.token });
}

function clearSession(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  useSsoStore.setState({ status: 'unauthenticated', user: null, token: null });
}

/**
 * Silent bootstrap: ask the auth service for a session using the shared cookie.
 * 200 → store the fresh JWT and mark authenticated; 401 → unauthenticated.
 * Network failure leaves status 'unknown' (so we don't wrongly show a login
 * button when the auth service is merely unreachable) but keeps any cached token.
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
        setSession(data);
        return;
      }
    }
    if (res.status === 401) {
      clearSession();
      return;
    }
  } catch {
    // Auth service unreachable — keep any cached token, stay 'unknown'.
  }
}

/** Redirect the top-level window to the auth login page, returning here after. */
export function login(): void {
  const ret = encodeURIComponent(window.location.href);
  window.location.href = `${AUTH_URL}/login?return=${ret}`;
}

/** Clear the shared cookie and local session, then reset to unauthenticated. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${AUTH_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // best-effort; clear locally regardless
  }
  clearSession();
}
