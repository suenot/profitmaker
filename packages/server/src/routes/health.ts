import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import ccxt from 'ccxt';
import { db } from '../db';
import pkg from '../../package.json';

const PORT = Number(process.env.PORT) || 3001;
const startedAt = Date.now();

async function pingDb(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    ccxtVersion: (ccxt as any).version,
    socketPort: PORT + 1,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    db: await pingDb(),
  }));
