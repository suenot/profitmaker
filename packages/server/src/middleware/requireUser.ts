import { db } from '../db';
import { validateSession } from '../services/auth';
import { getBootstrapUser } from '../services/bootstrapUser';

const API_TOKEN = process.env.API_TOKEN || 'your-secret-token';

export type AuthUser = { id: string; email: string; name: string | null };

/**
 * Extract and validate the user behind a Bearer token. Returns null if invalid.
 *
 * A bare API_TOKEN resolves to the single-user bootstrap account so that
 * token-only callers (agents, scripts, curl) can use every user-scoped route
 * exactly like a logged-in user. Real session tokens are validated unchanged.
 */
export const getUserFromRequest = async (request: Request): Promise<AuthUser | null> => {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  if (token === API_TOKEN) return await getBootstrapUser();
  return await validateSession(db, token);
};
