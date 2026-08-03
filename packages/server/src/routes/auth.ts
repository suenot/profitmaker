import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema/index';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
} from '../services/auth';
import { createDefaultDashboard } from '../services/defaultDashboard';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Self-service registration is OFF unless explicitly enabled. Every account this
 * server issues is fully privileged, so on any reachable deployment an anonymous
 * visitor could otherwise mint one for themselves.
 */
const ALLOW_REGISTRATION = /^(1|true|yes|on)$/i.test((process.env.ALLOW_REGISTRATION ?? '').trim());

/**
 * A real bcrypt hash (cost 12) of a throwaway random secret. No account holds
 * this password; it exists only so an unknown email spends the SAME ~500ms in
 * verifyPassword as a known one. Without it, login answers in ~5ms for an
 * address that is not registered and ~500ms for one that is, which enumerates
 * the user table from timing alone.
 */
const DUMMY_PASSWORD_HASH = '$2y$12$MVhb2IJooQ6.zosXk72IgujaGH4KqvsKWIYbOAI7oaChUIoitZ7qm';

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post(
    '/register',
    async ({ body, set }) => {
      if (!ALLOW_REGISTRATION) {
        set.status = 403;
        return { error: 'Registration is disabled on this server' };
      }

      const { email, password, name } = body;

      if (!emailRegex.test(email)) {
        set.status = 400;
        return { error: 'Invalid email format' };
      }

      if (password.length < 6) {
        set.status = 400;
        return { error: 'Password must be at least 6 characters' };
      }

      // Check if email is taken
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;
        return { error: 'Email already registered' };
      }

      const passwordHash = await hashPassword(password);

      const inserted = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          name: name ?? null,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
        });

      const user = inserted[0];
      const token = await createSession(db, user.id);

      // Create default dashboard, groups, providers for new user
      await createDefaultDashboard(user.id);

      return { user, token };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        name: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/login',
    async ({ body, set }) => {
      const { email, password } = body;

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (result.length === 0) {
        // Spend the same work as the found-user path before answering, so the
        // response time does not reveal whether this email is registered.
        await verifyPassword(password, DUMMY_PASSWORD_HASH);
        set.status = 401;
        return { error: 'Invalid email or password' };
      }

      const user = result[0];
      const valid = await verifyPassword(password, user.passwordHash);

      if (!valid) {
        set.status = 401;
        return { error: 'Invalid email or password' };
      }

      const token = await createSession(db, user.id);

      return {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  )
  .post('/logout', async ({ request, set }) => {
    const token = extractBearerToken(request);
    if (!token) {
      set.status = 401;
      return { error: 'Authorization token required' };
    }

    await deleteSession(db, token);
    return { success: true };
  })
  .get('/me', async ({ request, set }) => {
    const token = extractBearerToken(request);
    if (!token) {
      set.status = 401;
      return { error: 'Authorization token required' };
    }

    const user = await validateSession(db, token);
    if (!user) {
      set.status = 401;
      return { error: 'Invalid or expired session' };
    }

    return { user };
  });
