import { db } from '../db';
import { validateSession } from '../services/auth';
import { getBootstrapUser } from '../services/bootstrapUser';
import { getSsoUserFromToken, verifySsoToken } from '../services/ssoAuth';

const API_TOKEN = process.env.API_TOKEN || 'your-secret-token';

export type AuthUser = { id: string; email: string; name: string | null };

/**
 * Extract and validate the user behind a Bearer token. Returns null if invalid.
 *
 * Resolution order: API_TOKEN (→ single-user bootstrap account, for agents/
 * scripts/curl) → local session token → SSO JWT from auth.marketmaker.cc
 * (verified against its public JWKS, auto-provisioning a per-user account on
 * first login). Each path yields a user row, so all user-scoped routes work
 * unchanged regardless of how the caller authenticated.
 */
export const getUserFromRequest = async (request: Request): Promise<AuthUser | null> => {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  if (token === API_TOKEN) return await getBootstrapUser();
  const session = await validateSession(db, token);
  if (session) return session;
  return await getSsoUserFromToken(token);
};

/** Pull the raw Bearer token off a request, or null. */
export const getBearerToken = (request: Request): string | null => {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

/**
 * SSO context behind a request: the verified auth-service user id (JWT `sub`)
 * and the raw bearer token. Returns null unless the caller presented a valid SSO
 * JWT — the central-accounts flows are SSO-only (an API_TOKEN or local session
 * has no ecosystem identity to scope shared accounts or fetch central keys for).
 */
export const getSsoContextFromRequest = async (
  request: Request,
): Promise<{ ssoUserId: string; bearer: string } | null> => {
  const bearer = getBearerToken(request);
  if (!bearer) return null;
  const claims = await verifySsoToken(bearer);
  if (!claims) return null;
  return { ssoUserId: claims.userId, bearer };
};
