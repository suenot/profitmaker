import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  notes: text('notes'),
  // Explicit binding to an ecosystem SSO identity (auth.marketmaker.cc user id /
  // JWT `sub`). Unique so one SSO identity maps to exactly one local user; the
  // SSO login path keys on this, NOT on email, to prevent silent account takeover.
  ssoUserId: text('sso_user_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
