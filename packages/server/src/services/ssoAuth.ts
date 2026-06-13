import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/users';
import { hashPassword } from './auth';

/**
 * SSO verification against the MarketMaker ecosystem auth service
 * (https://auth.marketmaker.cc). Tokens are RS256 JWTs; we verify them with the
 * service's PUBLIC JWKS — no shared secret ever lives in this (public) repo.
 *
 * profitmaker runs at app.marketmaker.cc, a *.marketmaker.cc subdomain, so it
 * shares the `mm_session` cookie and bootstraps silently via the client; the
 * server's job is only to verify the bearer JWT the client presents.
 */

// Public auth base. Overridable for dev/staging via AUTH_URL; defaults to prod.
const AUTH_URL = (process.env.AUTH_URL || 'https://auth.marketmaker.cc').replace(/\/$/, '');
const JWKS_URL = new URL(`${AUTH_URL}/.well-known/jwks.json`);

// Optional role gate (off by default). When set, the JWT must carry a role for
// this service in its roles/services claim.
const REQUIRED_SERVICE = process.env.AUTH_REQUIRED_SERVICE || '';

/**
 * Remote JWKS resolver. jose fetches the key set lazily, caches it, applies a
 * cooldown between refreshes, and re-fetches automatically when a token's `kid`
 * is not in the cache (key rotation) — exactly the caching/refresh behaviour we
 * want, without hand-rolling it.
 */
const JWKS = createRemoteJWKSet(JWKS_URL);

export interface SsoClaims {
  /** auth-service user id (JWT `sub`). */
  userId: string;
  email: string;
  username: string | null;
  /** Per-service role map from the JWT (`roles`, or legacy `services`). */
  roles: Record<string, string>;
}

export interface SsoUser {
  id: string;
  email: string;
  name: string | null;
}

function extractClaims(payload: JWTPayload): SsoClaims | null {
  const userId = typeof payload.sub === 'string' ? payload.sub : null;
  const email = typeof payload.email === 'string' ? payload.email : null;
  if (!userId || !email) return null;
  const roles =
    (payload.roles as Record<string, string> | undefined) ||
    (payload.services as Record<string, string> | undefined) ||
    {};
  return {
    userId,
    email,
    username: typeof payload.username === 'string' ? payload.username : null,
    roles: roles && typeof roles === 'object' ? roles : {},
  };
}

/**
 * Verify an SSO JWT against the remote JWKS. Returns the claims, or null if the
 * token is invalid/expired or (when AUTH_REQUIRED_SERVICE is set) the user lacks
 * a role for the required service.
 */
export async function verifySsoToken(token: string): Promise<SsoClaims | null> {
  // A JWT has three dot-separated segments. Cheaply skip non-JWTs (e.g. the
  // local session UUIDs) so we don't hit the JWKS for every request.
  if (token.split('.').length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      // Accept tokens issued by this auth service. issuer/audience are not
      // currently set by the auth service; verifying the signature + expiry via
      // the trusted JWKS is the security boundary.
    });
    const claims = extractClaims(payload);
    if (!claims) return null;
    if (REQUIRED_SERVICE && !claims.roles[REQUIRED_SERVICE]) return null;
    return claims;
  } catch {
    return null;
  }
}

const ssoUserCache = new Map<string, string>(); // auth userId -> local user id

/**
 * Map a verified SSO identity to a local user row, auto-provisioning on first
 * login (so each ecosystem user gets their own dashboards/widgets/groups). We
 * key by email — the stable identity shared across the ecosystem — and store the
 * auth user_id in `notes` for traceability.
 */
export async function resolveSsoUser(claims: SsoClaims): Promise<SsoUser> {
  const cachedId = ssoUserCache.get(claims.userId);
  if (cachedId) {
    return { id: cachedId, email: claims.email, name: claims.username };
  }

  const [existing] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, claims.email))
    .limit(1);

  if (existing) {
    ssoUserCache.set(claims.userId, existing.id);
    return { id: existing.id, email: existing.email, name: existing.name };
  }

  // First SSO login for this email — provision a local user. The password hash
  // is never used to log in (auth is delegated to the SSO service); the column
  // is NOT NULL, so we store a hash of a random secret.
  const passwordHash = await hashPassword(crypto.randomUUID());
  const [created] = await db
    .insert(users)
    .values({
      email: claims.email,
      passwordHash,
      name: claims.username,
      notes: `sso:${claims.userId}`,
    })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email, name: users.name });

  if (created) {
    ssoUserCache.set(claims.userId, created.id);
    return { id: created.id, email: created.email, name: created.name };
  }

  // Lost an insert race — read the winner back.
  const [winner] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, claims.email))
    .limit(1);
  ssoUserCache.set(claims.userId, winner.id);
  return { id: winner.id, email: winner.email, name: winner.name };
}

/** Verify a token and resolve it to a local user in one step. */
export async function getSsoUserFromToken(token: string): Promise<SsoUser | null> {
  const claims = await verifySsoToken(token);
  if (!claims) return null;
  return resolveSsoUser(claims);
}
