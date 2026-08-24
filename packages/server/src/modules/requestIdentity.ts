/**
 * Host-minted caller identity for module dispatch. The auth gate resolves the
 * caller (local session or SSO JWT) and records the identity here; the module
 * dispatcher injects ONLY the opaque ids as `x-pm-user-*` headers. Credentials
 * never cross the module boundary, and client-supplied identity headers are
 * stripped before injection — identity is minted by the host, never asserted
 * by the caller. WeakMap: identity lives exactly as long as the Request.
 */
export interface RequestIdentity {
  userId: string;
  authUserId: string | null;
  /**
   * Verified per-service roles from the SSO JWT (host-internal only — used by
   * host routes to gate privileged operations). Null for local sessions, which
   * carry no auth-service roles. rewriteForModule must NEVER inject roles into
   * module-visible headers: modules are untrusted third-party code, and telling
   * one "this caller is an admin" is a privilege leak. Roles stay on the host
   * side of the boundary; modules see only the opaque ids.
   */
  roles: Record<string, string> | null;
}

const identities = new WeakMap<Request, RequestIdentity>();

export function recordRequestIdentity(request: Request, identity: RequestIdentity): void {
  identities.set(request, identity);
}

export function peekRequestIdentity(request: Request): RequestIdentity | undefined {
  return identities.get(request);
}
