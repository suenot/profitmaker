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
}

const identities = new WeakMap<Request, RequestIdentity>();

export function recordRequestIdentity(request: Request, identity: RequestIdentity): void {
  identities.set(request, identity);
}

export function peekRequestIdentity(request: Request): RequestIdentity | undefined {
  return identities.get(request);
}
