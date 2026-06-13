import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/users';
import { hashPassword } from './auth';

const BOOTSTRAP_EMAIL = 'default@local';

let cachedBootstrapUserId: string | null = null;

/**
 * Resolve the single-user "bootstrap" account that backs API_TOKEN access.
 *
 * When the server is driven purely by a static API_TOKEN (no interactive
 * login — e.g. an agent, a script, or curl) there is no session and therefore
 * no user row to scope CRUD against. We lazily create one `default@local` user
 * on first use and reuse it forever after. The id is cached in-process so the
 * hot path is a single map lookup after the first request.
 */
export async function getBootstrapUser(): Promise<{ id: string; email: string; name: string | null }> {
  if (cachedBootstrapUserId) {
    return { id: cachedBootstrapUserId, email: BOOTSTRAP_EMAIL, name: 'Default' };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, BOOTSTRAP_EMAIL))
    .limit(1);

  if (existing) {
    cachedBootstrapUserId = existing.id;
    return { id: existing.id, email: BOOTSTRAP_EMAIL, name: 'Default' };
  }

  // The password hash is never used for login (there is no password to enter),
  // but the column is NOT NULL, so we store a hash of a random secret.
  const passwordHash = await hashPassword(crypto.randomUUID());
  const [created] = await db
    .insert(users)
    .values({ email: BOOTSTRAP_EMAIL, passwordHash, name: 'Default' })
    .onConflictDoNothing()
    .returning({ id: users.id });

  if (created) {
    cachedBootstrapUserId = created.id;
    return { id: created.id, email: BOOTSTRAP_EMAIL, name: 'Default' };
  }

  // Lost an insert race with a concurrent request — read the winner back.
  const [winner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, BOOTSTRAP_EMAIL))
    .limit(1);
  cachedBootstrapUserId = winner.id;
  return { id: winner.id, email: BOOTSTRAP_EMAIL, name: 'Default' };
}
