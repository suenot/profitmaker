import { db } from '../db';
import { validateSession } from '../services/auth';
import { getBootstrapUser } from '../services/bootstrapUser';
import { getSsoUserFromToken } from '../services/ssoAuth';

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
