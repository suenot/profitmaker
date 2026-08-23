import { db } from '../db';
import { validateSession } from '../services/auth';
import { matchesApiToken } from '../services/apiToken';
import { getSsoUserFromToken } from '../services/ssoAuth';
import { recordRequestIdentity } from '../modules/requestIdentity';

/**
 * The root auth gate, registered as `onBeforeHandle` in src/index.ts (BEFORE
 * every route plugin is merged in, so it covers all of them).
 *
 * Resolution order: skip-listed paths → server-to-server API_TOKEN → local
 * session token → SSO JWT. On the session/SSO paths the resolved caller is
 * recorded on the Request (see modules/requestIdentity) so the module
 * dispatcher can later mint `x-pm-user-*` headers — the only identity modules
 * ever see. API_TOKEN callers are services, not users: nothing is recorded.
 *
 * Kept as a standalone function (not inline in index.ts) so the gate — the
 * security boundary of the whole HTTP surface — is unit-testable without
 * booting Bun.serve/Socket.IO.
 */
export async function authGate({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}): Promise<{ error: string } | undefined> {
  const pathname = new URL(request.url).pathname;

  // Skip auth for health, auth routes, and static files
  if (pathname === '/health' || pathname.startsWith('/api/auth')) return;
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/ws')) return;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    set.status = 401;
    return { error: 'Access token required' };
  }

  // Allow server-to-server API_TOKEN (no-op when none is configured)
  if (matchesApiToken(token)) return;

  // Allow valid local user session token. A local session carries no
  // auth-service identity (validateSession does not expose the users.sso_user_id
  // link), so authUserId is minted as null — same semantics as the socket
  // path's billing user.
  const user = await validateSession(db, token);
  if (user) {
    recordRequestIdentity(request, { userId: user.id, authUserId: null });
    return;
  }

  // Allow a valid SSO JWT from auth.marketmaker.cc (verified via public JWKS).
  const ssoUser = await getSsoUserFromToken(token);
  if (ssoUser) {
    recordRequestIdentity(request, { userId: ssoUser.id, authUserId: ssoUser.authUserId });
    return;
  }

  set.status = 403;
  return { error: 'Invalid token' };
}
