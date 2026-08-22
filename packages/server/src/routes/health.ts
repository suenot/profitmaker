import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { getEgressIp } from '../services/egressIp';
import pkg from '../../package.json';

const PORT = Number(process.env.PORT) || 3001;
const startedAt = Date.now();
const ccxtPkg = await Bun.file(Bun.resolveSync('ccxt/package.json', import.meta.dir)).json() as {
  version: string;
};

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
    // CCXT 4.5.74's ESM runtime constant was published as 4.5.73. The package
    // manifest is the installed-version source of truth and matches the lockfile.
    ccxtVersion: ccxtPkg.version,
    socketPort: PORT + 1,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    db: await pingDb(),
  }))

  // Intentionally public: the egress IP is the source address exchanges already
  // see on every outgoing request — not a secret — and users configuring an API
  // key IP whitelist need it. (The index.ts auth gate only covers /api/* and
  // /ws/*.) `ip` is null while the resolve is unknown/in flight.
  .get('/egress-ip', async () => ({ ip: await getEgressIp() }));
