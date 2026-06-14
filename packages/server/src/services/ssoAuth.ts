import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/users';
import { hashPassword } from './auth';

/**
 * SSO verification against the MarketMaker ecosystem auth service
 * (https://auth.marketmaker.cc). Tokens are RS256 JWTs; we verify them with the
 * service's PUBLIC JWKS — no shared secret ever lives in this (public) repo.
 *
 * profitmaker runs at terminal.marketmaker.cc, a *.marketmaker.cc subdomain, so it
 * shares the `mm_session` cookie and bootstraps silently via the client; the
 * server's job is only to verify the bearer JWT the client presents.
 */

// Public auth base. Overridable for dev/staging via AUTH_URL; defaults to prod.
const AUTH_URL = (process.env.AUTH_URL || 'https://auth.marketmaker.cc').replace(/\/$/, '');
const JWKS_URL = new URL(`${AUTH_URL}/.well-known/jwks.json`);

// Optional role gate (off by default). When set, the JWT must carry a role for
// this service in its roles/services claim.
const REQUIRED_SERVICE = process.env.AUTH_REQUIRED_SERVICE || '';

// The auth service does not currently set an `iss` claim (its JWTs are shared
// across the whole ecosystem). If it ever does, set AUTH_VERIFY_ISSUER=1 to bind
// tokens to AUTH_URL as well.
const VERIFY_ISSUER = process.env.AUTH_VERIFY_ISSUER === '1';

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

/**
 * Extract and strictly validate the claims of an SSO JWT. Requires `sub`,
 * `email`, and a roles/services map to be present — a token missing the role
 * map is not a session token from this service and is rejected. This narrows the
 * set of accepted tokens beyond "any RS256 token the auth service ever signed".
 */
function extractClaims(payload: JWTPayload): SsoClaims | null {
  const userId = typeof payload.sub === 'string' ? payload.sub : null;
  const email = typeof payload.email === 'string' ? payload.email : null;
  if (!userId || !email) return null;

  const roleClaim =
    (payload.roles as unknown) ?? (payload.services as unknown);
  // The roles/services claim MUST be present and be an object. A session JWT
  // from this auth service always carries it; other token classes do not.
  if (!roleClaim || typeof roleClaim !== 'object' || Array.isArray(roleClaim)) return null;

  return {
    userId,
    email,
    username: typeof payload.username === 'string' ? payload.username : null,
    roles: roleClaim as Record<string, string>,
  };
}

/**
 * Verify an SSO JWT against the remote JWKS. Returns the claims, or null if the
 * token is invalid/expired, signed with the wrong algorithm, missing required
 * claims, or (when AUTH_REQUIRED_SERVICE is set) the user lacks a role for the
 * required service.
 */
export async function verifySsoToken(token: string): Promise<SsoClaims | null> {
  // A JWT has three dot-separated segments. Cheaply skip non-JWTs (e.g. the
  // local session UUIDs) so we don't hit the JWKS for every request.
  if (token.split('.').length !== 3) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      // PIN the algorithm: only accept RS256 (the JWKS keys' alg). Without this
      // a token could assert a different alg and bypass the intended check.
      algorithms: ['RS256'],
      // Bind to the issuer only if the auth service starts setting `iss` and the
      // operator opts in — it currently issues ecosystem-wide tokens with no iss.
      ...(VERIFY_ISSUER ? { issuer: AUTH_URL } : {}),
    });
    const claims = extractClaims(payload);
    if (!claims) return null;
    if (REQUIRED_SERVICE && !claims.roles[REQUIRED_SERVICE]) return null;
    return claims;
  } catch {
    return null;
  }
}

const ssoUserCache = new Map<string, string>(); // sso userId -> local user id

/**
 * Map a verified SSO identity to a local user row by its EXPLICIT binding
 * (`users.sso_user_id`), never silently by email. Resolution order:
 *
 *   (a) a user already bound to this `sso_user_id` → use it;
 *   (b) a user with this email but NO sso binding yet → first-time bind (record
 *       sso_user_id on that row and adopt it);
 *   (c) a user with this email but bound to a DIFFERENT sso_user_id → REJECT
 *       (return null → 403). No silent takeover of someone else's account;
 *   (d) no such user → provision a fresh one bound to this sso_user_id.
 *
 * Returns null when the identity cannot be safely resolved (case c). This closes
 * the email-based account-takeover vector: a local account is only ever attached
 * to one SSO identity, and a second SSO identity can never claim it.
 */
export async function resolveSsoUser(claims: SsoClaims): Promise<SsoUser | null> {
  const cachedId = ssoUserCache.get(claims.userId);
  if (cachedId) {
    return { id: cachedId, email: claims.email, name: claims.username };
  }

  // (a) Canonical lookup: already bound to this SSO identity.
  const [bound] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.ssoUserId, claims.userId))
    .limit(1);
  if (bound) {
    ssoUserCache.set(claims.userId, bound.id);
    return { id: bound.id, email: bound.email, name: bound.name };
  }

  // Is there a local account holding this email?
  const [byEmail] = await db
    .select({ id: users.id, email: users.email, name: users.name, ssoUserId: users.ssoUserId })
    .from(users)
    .where(eq(users.email, claims.email))
    .limit(1);

  if (byEmail) {
    if (byEmail.ssoUserId && byEmail.ssoUserId !== claims.userId) {
      // (c) Email belongs to a DIFFERENT SSO identity — refuse, do not attach.
      console.warn(`[sso] refusing login: email ${claims.email} is bound to a different SSO identity`);
      return null;
    }
    // (b) First-time bind of an existing, unbound local account. Guard the
    // UPDATE with sso_user_id IS NULL so a concurrent bind can't race us into
    // overwriting a binding that just landed.
    const [adopted] = await db
      .update(users)
      .set({ ssoUserId: claims.userId, updatedAt: new Date() })
      .where(and(eq(users.id, byEmail.id), isNull(users.ssoUserId)))
      .returning({ id: users.id, email: users.email, name: users.name });
    if (adopted) {
      ssoUserCache.set(claims.userId, adopted.id);
      return { id: adopted.id, email: adopted.email, name: adopted.name };
    }
    // Lost the race — someone bound this row first. Re-resolve from the top.
    return resolveSsoUser(claims);
  }

  // (d) No local account — provision one bound to this SSO identity. The
  // password hash is never used to log in (auth is delegated to SSO) but the
  // column is NOT NULL, so we store a hash of a random secret.
  const passwordHash = await hashPassword(crypto.randomUUID());
  const [created] = await db
    .insert(users)
    .values({
      email: claims.email,
      passwordHash,
      name: claims.username,
      ssoUserId: claims.userId,
    })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email, name: users.name });

  if (created) {
    ssoUserCache.set(claims.userId, created.id);
    return { id: created.id, email: created.email, name: created.name };
  }

  // Lost an insert race (email or sso_user_id unique conflict) — re-resolve so
  // the winning row goes through the same safe (a)/(b)/(c) checks.
  return resolveSsoUser(claims);
}

/** Verify a token and resolve it to a local user in one step. */
export async function getSsoUserFromToken(token: string): Promise<SsoUser | null> {
  const claims = await verifySsoToken(token);
  if (!claims) return null;
  return resolveSsoUser(claims);
}
