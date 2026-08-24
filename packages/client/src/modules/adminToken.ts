/**
 * Operator credential for the module lifecycle routes
 * (install/enable/disable/upgrade/uninstall).
 *
 * The server fails closed until MODULES_ADMIN_TOKEN is configured there, and
 * expects the same secret in its own X-Modules-Admin-Token header — a normal
 * user session never authorizes running third-party code. The operator enters
 * the token once in the Module Store; it is kept in localStorage and attached
 * to lifecycle calls only. Search/list/dispatch never send it.
 */
const STORAGE_KEY = 'pm.modules-admin-token';

export const ADMIN_TOKEN_HEADER = 'x-modules-admin-token';

/** localStorage can be absent (tests, hardened browsers) or throw (sandboxed). */
function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function getAdminToken(): string {
  return storage()?.getItem(STORAGE_KEY) ?? '';
}

export function setAdminToken(value: string): void {
  const s = storage();
  if (!s) return;
  if (value) s.setItem(STORAGE_KEY, value);
  else s.removeItem(STORAGE_KEY);
}

/**
 * Attach the operator header to a RequestInit when a token is stored. Returns
 * the init unchanged otherwise, so non-operator calls stay untouched.
 */
export function withAdminToken(init: RequestInit = {}): RequestInit {
  const token = getAdminToken();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set(ADMIN_TOKEN_HEADER, token);
  return { ...init, headers };
}
