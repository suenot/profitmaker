import { useDataProviderStore } from '@/store/dataProviderStore';
import type { CCXTServerProvider, DataProvider } from '@/types/dataProviders';
import { getSsoToken } from '@/services/ssoClient';

/**
 * Server base + authenticated fetch for the module system.
 *
 * Modules talk to the terminal server through the same ccxt-server provider the
 * terminal itself uses, so they inherit its URL and Bearer token. We resolve the
 * base lazily (per call) rather than caching, because the user can change the
 * provider config at runtime.
 */

const DEV_FALLBACK_BASE = 'http://localhost:3001';

function isCcxtServer(p: DataProvider): p is CCXTServerProvider {
  return p.type === 'ccxt-server';
}

/**
 * Pick the ccxt-server provider whose URL/token the module system should use:
 * prefer a connected one, else any configured ccxt-server provider.
 */
function resolveCcxtServerProvider(): CCXTServerProvider | undefined {
  const providers = Object.values(useDataProviderStore.getState().providers) as DataProvider[];
  const servers = providers.filter(isCcxtServer);
  return servers.find((p) => p.status === 'connected') ?? servers[0];
}

/**
 * Resolve the HTTP base URL for terminal-server calls (no trailing slash):
 *   1. enabled/connected ccxt-server provider's config.serverUrl, else
 *   2. window.location.origin in production (served from the same origin), else
 *   3. http://localhost:3001 in dev.
 */
export function resolveServerBase(): string {
  const provider = resolveCcxtServerProvider();
  if (provider?.config.serverUrl) {
    return provider.config.serverUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin && !import.meta.env.DEV) {
    return window.location.origin.replace(/\/$/, '');
  }
  return DEV_FALLBACK_BASE;
}

/**
 * The Bearer token for terminal-server calls: the SSO session token (preferred,
 * when an ecosystem user is logged in) else the token configured on the resolved
 * ccxt-server provider.
 */
export function resolveServerToken(): string | undefined {
  return getSsoToken() || resolveCcxtServerProvider()?.config.token;
}

/**
 * Whether `url` targets the same origin as `base`. Fails closed: an unparseable
 * url or base counts as cross-origin.
 */
function isSameOrigin(url: string, base: string): boolean {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

/**
 * Authenticated fetch against the terminal server. `path` may be absolute
 * ('http(s)://...') or server-relative ('/api/modules/...'); relative paths are
 * resolved against {@link resolveServerBase}. Attaches the Bearer token the same
 * way ccxtServerProvider does.
 *
 * SECURITY: this is the fetch handed to third-party modules as
 * `terminal.api.fetch`, and the Bearer token it attaches authorizes the ENTIRE
 * /api/* surface (orders, accounts, dashboards). An absolute URL pointing
 * anywhere other than the terminal server is therefore rejected outright rather
 * than merely stripped of its Authorization header — a module that genuinely
 * needs a third-party endpoint must use the global `fetch`, which carries no
 * terminal credentials.
 */
export function moduleFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = resolveServerBase();
  const url = /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  if (!isSameOrigin(url, base)) {
    return Promise.reject(
      new Error(
        `[module-api] refusing to send an authenticated request to "${url}" — ` +
          `terminal.api.fetch only targets the terminal server (${base}). ` +
          'Use the global fetch() for third-party endpoints.',
      ),
    );
  }

  const token = resolveServerToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}
