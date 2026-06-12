import { Elysia } from 'elysia';
import type {
  BackendModule,
  BackendModuleContext,
  Disposable,
} from '@profitmaker/module-sdk';

/**
 * Example backend module.
 *
 * Demonstrates the full BackendModuleContext surface:
 *  - ctx.log         prefixed logging
 *  - ctx.storage     persisted counter (survives enable/disable, not deleted)
 *  - ctx.jobs.every  a heartbeat that ticks every 10s and is auto-cleared on stop
 *  - ctx.io          Socket.IO namespace '/m/example' — push live updates to clients
 *  - ctx.ccxt        shared CCXT access (used by /ticker below)
 *  - routes          an Elysia plugin; the host mounts it under /api/modules/example
 *
 * IMPORTANT — routes are RELATIVE TO ROOT. Define `.get('/hello')`, NOT
 * `.get('/api/modules/example/hello')`. The host strips the
 * `/api/modules/<id>` mount prefix before dispatching, so a request to
 * `/api/modules/example/hello` arrives here as `/hello`.
 */

const STORAGE_KEY = 'heartbeat-count';

let heartbeat = 0;
let job: Disposable | null = null;

const moduleDefinition: BackendModule = {
  async start(ctx: BackendModuleContext) {
    ctx.log.info(`starting (v${ctx.version}), routes at ${ctx.routesPrefix}`);

    // Restore the persisted counter so it survives disable/enable cycles.
    heartbeat = (await ctx.storage.get<number>(STORAGE_KEY)) ?? 0;

    // Heartbeat: bump the counter, persist it, and push it to any connected
    // clients on this module's Socket.IO namespace. Auto-cleared on stop().
    job = ctx.jobs.every(
      10_000,
      async () => {
        heartbeat += 1;
        await ctx.storage.set(STORAGE_KEY, heartbeat);
        ctx.io.emit('heartbeat', heartbeat);
        ctx.log.info(`heartbeat #${heartbeat}`);
      },
      'heartbeat',
    );

    // Routes RELATIVE TO ROOT (host mounts them under /api/modules/example).
    const routes = new Elysia()
      // GET /api/modules/example/hello
      .get('/hello', () => ({
        message: 'hello from the example module backend',
        id: ctx.id,
        version: ctx.version,
      }))
      // GET /api/modules/example/state — current heartbeat counter
      .get('/state', async () => ({
        heartbeat,
        persisted: await ctx.storage.get<number>(STORAGE_KEY),
      }))
      // GET /api/modules/example/ticker?exchange=binance&symbol=BTC/USDT
      // Demonstrates shared CCXT access (market-data permission).
      .get('/ticker', async ({ query, set }) => {
        const exchange = (query.exchange as string) || 'binance';
        const symbol = (query.symbol as string) || 'BTC/USDT';
        try {
          const ex = (await ctx.ccxt.getInstance({ exchangeId: exchange })) as {
            fetchTicker(s: string): Promise<{ last?: number }>;
          };
          const ticker = await ex.fetchTicker(symbol);
          return { exchange, symbol, last: ticker.last ?? null };
        } catch (err) {
          set.status = 502;
          return { error: err instanceof Error ? err.message : String(err) };
        }
      });

    return { routes };
  },

  async stop() {
    // jobs are force-cleared by the host on stop(); disposing here too is
    // harmless and documents intent. Local handle cleared for tidiness.
    job?.dispose();
    job = null;
  },
};

export default moduleDefinition;
