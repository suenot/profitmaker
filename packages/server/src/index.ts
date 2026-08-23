import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Server as SocketIOServer } from 'socket.io';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'node:crypto';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboards';
import { widgetRoutes } from './routes/widgets';
import { groupRoutes } from './routes/groups';
import { accountRoutes } from './routes/accounts';
import { settingsRoutes } from './routes/settings';
import { providerRoutes } from './routes/providers';
import { exchangeRoutes } from './routes/exchange';
import { websocketRoutes } from './routes/websocket';
import { proxyRoutes } from './routes/proxy';
import { moduleRoutes, moduleAssetRoutes } from './routes/modules';
import { uiRoutes } from './routes/ui';
import { moduleManager } from './modules/manager';
import { authGate } from './middleware/authGate';
import { registerBuiltinProviders } from './providers';
import { cleanupCache } from './services/ccxtCache';
import { warmEgressIp } from './services/egressIp';
import { validateSession, deleteExpiredSessions } from './services/auth';
import { matchesApiToken } from './services/apiToken';
import { getBootstrapUser } from './services/bootstrapUser';
import { getSsoUserFromToken } from './services/ssoAuth';
import { setStateEventsIO, userRoom } from './services/stateEvents';
import { setUiCommandsIO, registerUiCommandSocket } from './services/uiCommands';
import { db } from './db';
import {
  createSubscriptionKey,
  startWebSocketSubscription,
  addSubscription,
  hasSubscription,
  removeSubscriptionFromSocket,
  removeSocketSubscriptions,
  type WebSocketSubscription,
} from './services/wsSubscriptions';
import { usageMeter } from './services/usageMeter';
import {
  activatePrivateSubscription,
  hasPrivateSubscription,
  startPrivateSubscription,
  stopPrivateSubscription,
  stopSocketPrivateSubscriptions,
} from './services/privateWsSubscriptions';

const PORT = Number(process.env.PORT) || 3001;
const STATIC_DIR = process.env.STATIC_DIR || join(import.meta.dir, '../../client/dist');

// Browser origins allowed to reach the Socket.IO server (which always runs
// cross-origin from the SPA — it listens on PORT + 1). Unset ⇒ local dev origins
// only; a deployed terminal MUST set ALLOWED_ORIGINS to its own public origin.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const DEV_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const SOCKET_ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEV_ORIGINS;

// Subscriptions are backed by a live exchange websocket each, so an unbounded
// count is a resource-exhaustion lever. Applies per socket.
const MAX_SUBSCRIPTIONS_PER_SOCKET = 50;
const PUBLIC_MARKET_DATA_TYPES = new Set(['ticker', 'trades', 'orderbook', 'ohlcv']);

const streamOperationCode = (dataType: string): string =>
  `terminal.market.${dataType.replace(/[^a-zA-Z0-9_-]/g, '_')}_stream`;

const streamChannelHash = (exchangeId: string, symbol: string, dataType: string, timeframe?: string): string =>
  createHash('sha256')
    .update(`${exchangeId.toLowerCase()}:${symbol.toUpperCase()}:${dataType.toLowerCase()}:${timeframe ?? ''}`)
    .digest('hex');

/**
 * Replace the body of any 500 that escapes a route.
 *
 * Elysia renders an unhandled throw as status 500 with `error.message` as the
 * body — which is how a Postgres unique-violation ("duplicate key value violates
 * unique constraint ...") or a connection string reaches the client verbatim.
 *
 * This runs at the transport boundary rather than as a root `.onError` on
 * purpose: an Elysia error hook registered on the root instance takes precedence
 * over every per-route handler in the merged chain, so a root hook would
 * silently disable domain error mapping (ccxt → 404/400) across the whole app.
 * Here, anything a route mapped deliberately — 400, 404, 502 — passes through
 * untouched, and only unhandled failures are flattened. Response headers are
 * carried over so CORS still applies to the sanitized error.
 */
async function sanitizeServerError(res: Response, req: Request): Promise<Response> {
  if (res.status !== 500) return res;

  let detail = await res.clone().text();
  // A failed drizzle query renders its BOUND PARAMS into the message, and for a
  // session lookup that includes the caller's bearer token — so scrub the
  // presented credential before it reaches the log, and cap the length.
  const bearer = req.headers.get('authorization')?.replace(/^Bearer /, '').trim();
  if (bearer) detail = detail.split(bearer).join('<redacted-token>');
  console.error(`[error] ${req.method} ${new URL(req.url).pathname}: ${detail.slice(0, 2000)}`);
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { ...Object.fromEntries(res.headers), 'content-type': 'application/json' },
  });
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Elysia HTTP server
const app = new Elysia()
  .use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))
  .use(healthRoutes)
  .use(authRoutes)
  .onBeforeHandle(authGate)
  .use(dashboardRoutes)
  .use(widgetRoutes)
  .use(groupRoutes)
  .use(accountRoutes)
  .use(settingsRoutes)
  .use(providerRoutes)
  .use(exchangeRoutes)
  .use(websocketRoutes)
  .use(proxyRoutes)
  .use(uiRoutes)
  .use(moduleRoutes)
  .use(moduleAssetRoutes);

// Helper: serve static file
function serveStatic(pathname: string): Response | null {
  const filePath = join(STATIC_DIR, pathname);
  const ext = extname(filePath);
  if (ext && existsSync(filePath)) {
    return new Response(Bun.file(filePath), {
      headers: { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' },
    });
  }
  return null;
}

function serveIndex(): Response {
  const indexPath = join(STATIC_DIR, 'index.html');
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  return new Response('Not Found', { status: 404 });
}

// Use Bun.serve to wrap Elysia with static file fallback
Bun.serve({
  port: PORT,
  async fetch(req) {
    const pathname = new URL(req.url).pathname;

    // API routes and module bundle/asset routes go to Elysia.
    // /modules/ is outside /api/ and intentionally bypasses Bearer auth.
    // /health is a prefix: sub-routes like /health/egress-ip must reach Elysia
    // too, or they'd fall through to the SPA index fallback.
    if (pathname.startsWith('/api/') || pathname.startsWith('/health') || pathname.startsWith('/modules/')) {
      return sanitizeServerError(await app.handle(req), req);
    }

    // Try static file first
    const staticResp = serveStatic(pathname);
    if (staticResp) return staticResp;

    // SPA fallback
    return serveIndex();
  },
});

// Socket.IO attaches to the same Bun server via its underlying http handling
const io = new SocketIOServer(PORT + 1, {
  cors: { origin: SOCKET_ORIGINS, methods: ['GET', 'POST'] },
});

if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    '[cors] ALLOWED_ORIGINS is unset — Socket.IO accepts local dev origins only ' +
      `(${DEV_ORIGINS.join(', ')}). Set ALLOWED_ORIGINS to this terminal's public origin before deploying.`,
  );
}

// Wire the Socket.IO server into the state-change and ui:command services so
// REST mutations can broadcast to a user's room and commands can round-trip.
setStateEventsIO(io);
setUiCommandsIO(io);

// Register the built-in 'ccxt' provider before serving any /api/exchange request
// (modules register additional providers during moduleManager.init).
registerBuiltinProviders();

// Boot the module system once Socket.IO is available. A broken module records
// its error and is skipped — it must never abort server boot.
moduleManager.init(io).catch((err) => {
  console.error('[modules] init failed:', err);
});

usageMeter.start();

// Resolve the public egress IP up front (cached, retried in the background on
// failure) so the first exchange IP-whitelist rejection can already name the
// address to add.
warmEgressIp();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscription ids this socket actually created. Tracked here because the
  // shared registry keys teardown by subscription id alone, so without an
  // ownership set any socket could unsubscribe another socket's stream.
  const ownedSubscriptions = new Set<string>();
  const ownedPrivateSubscriptions = new Set<string>();
  const pendingPrivateSubscriptions = new Set<string>();

  // Acks for ui:command round-trips (POST /api/ui/command).
  registerUiCommandSocket(socket);

  socket.on('authenticate', async (data) => {
    // Resolve the caller to a user (same order as the HTTP gate): a bare
    // API_TOKEN maps to the bootstrap user; else a valid local session; else a
    // valid SSO JWT from auth.marketmaker.cc. On success the socket joins that
    // user's room so it receives state:changed / ui:command events.
    let userId: string | null = null;
    let billingUserId: string | null = null;
    try {
      if (typeof data?.token === 'string' && matchesApiToken(data.token)) {
        userId = (await getBootstrapUser()).id;
      } else if (typeof data?.token === 'string') {
        const session = await validateSession(db, data.token);
        if (session) {
          userId = session.id;
        } else {
          const ssoUser = await getSsoUserFromToken(data.token);
          userId = ssoUser?.id ?? null;
          billingUserId = ssoUser?.authUserId ?? null;
        }
      }
    } catch (err) {
      console.error('[socket] authenticate failed:', err);
    }

    if (!userId) {
      socket.emit('auth_error', { error: 'Invalid token' });
      socket.disconnect();
      return;
    }

    socket.data.userId = userId;
    socket.data.billingUserId = billingUserId;
    socket.join(userRoom(userId));
    socket.emit('authenticated', { success: true, userId });
  });

  socket.on('subscribe', async (data) => {
    const { exchangeId, symbol, dataType, timeframe, config, providerId } = data;
    if (!exchangeId || !symbol || !dataType) {
      socket.emit('subscription_error', { error: 'Missing required parameters' });
      return;
    }
    // Public market data remains usable without an account. Anything capable
    // of exposing account state must use an authenticated socket (and new
    // clients use the credential-free private:* accountId protocol instead).
    if (!socket.data.userId && !PUBLIC_MARKET_DATA_TYPES.has(dataType)) {
      socket.emit('subscription_error', { error: 'Authentication required for account data' });
      return;
    }

    if (ownedSubscriptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
      socket.emit('subscription_error', {
        error: `Subscription limit reached (max ${MAX_SUBSCRIPTIONS_PER_SOCKET} per connection)`,
      });
      return;
    }

    const subscriptionKey = createSubscriptionKey(exchangeId, symbol, dataType, timeframe);
    const subscriptionId = `${socket.id}:${subscriptionKey}`;
    const operationCode = streamOperationCode(dataType);
    const operation = usageMeter.describe(operationCode);

    // A paid operation without a canonical auth-service identity could never be
    // settled safely. Unknown and explicitly-free operations remain available.
    if (operation.billing_model !== 'free' && /[1-9]/.test(operation.unit_price_mm) && !socket.data.billingUserId) {
      socket.emit('subscription_error', { error: 'Central billing identity required for this paid subscription' });
      return;
    }

    if (hasSubscription(subscriptionId)) {
      socket.emit('subscription_error', { error: 'Subscription already exists' });
      return;
    }

    const usage = usageMeter.beginStream({
      userId: socket.data.billingUserId ?? undefined,
      operationCode,
      canonicalChannelHash: streamChannelHash(exchangeId, symbol, dataType, timeframe),
      connectionId: socket.id,
    });
    // Provider resolution and the initial watch call are setup time. Active
    // billing begins only after the first successfully delivered publication.
    usage.pause();

    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      socketId: socket.id,
      exchangeId,
      symbol,
      dataType,
      timeframe,
      config: { ...config, ccxtType: 'pro' as const },
      providerId,
      isActive: true,
      usage,
    };

    addSubscription(subscription);
    ownedSubscriptions.add(subscriptionId);

    try {
      await startWebSocketSubscription(
        subscription,
        (sid, d) => io.to(sid).emit('data', d),
        (sid, d) => io.to(sid).emit('error', d)
      );
      socket.emit('subscribed', {
        subscriptionId,
        exchangeId,
        symbol,
        dataType,
        timeframe,
        operationCode: operation.operation_code,
        billingModel: operation.billing_model,
        priceVersion: operation.price_version ?? 'unregistered',
        unitPriceMm: operation.unit_price_mm,
        unitType: operation.unit_type,
        channelWeight: operation.channel_weight ?? '1',
      });
    } catch (error) {
      // Clean up orphan subscription on failure
      ownedSubscriptions.delete(subscriptionId);
      removeSubscriptionFromSocket(socket.id, subscriptionId);
      socket.emit('subscription_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  socket.on('private:subscribe', async (data) => {
    // Central-account credentials can only be resolved for an SSO identity.
    // The browser sends account/routing ids only; inline credentials are never
    // accepted on this event.
    if (!socket.data.billingUserId) {
      socket.emit('private:error', { error: 'SSO authentication required for private streams', fatal: true });
      return;
    }

    const accountId = typeof data?.accountId === 'string' ? data.accountId.trim() : '';
    const exchangeId = typeof data?.exchangeId === 'string' ? data.exchangeId.trim() : '';
    const symbol = typeof data?.symbol === 'string' ? data.symbol.trim() : '';
    const market = typeof data?.market === 'string' ? data.market.trim() : undefined;
    if (!accountId || !exchangeId || !symbol) {
      socket.emit('private:error', { error: 'accountId, exchangeId and symbol are required', fatal: true });
      return;
    }
    if (
      ownedSubscriptions.size
      + ownedPrivateSubscriptions.size
      + pendingPrivateSubscriptions.size
      >= MAX_SUBSCRIPTIONS_PER_SOCKET
    ) {
      socket.emit('private:error', { error: `Subscription limit reached (max ${MAX_SUBSCRIPTIONS_PER_SOCKET})`, fatal: true });
      return;
    }

    const privateKey = createHash('sha256')
      .update(`${socket.data.billingUserId}:${accountId}:${exchangeId}:${market ?? 'spot'}:${symbol}`)
      .digest('hex');
    const subscriptionId = `${socket.id}:private:${privateKey}`;
    if (hasPrivateSubscription(subscriptionId) || pendingPrivateSubscriptions.has(subscriptionId)) {
      socket.emit('private:error', { subscriptionId, accountId, error: 'Private subscription already exists', fatal: true });
      return;
    }

    pendingPrivateSubscriptions.add(subscriptionId);
    try {
      const subscription = await startPrivateSubscription({
        id: subscriptionId,
        socketId: socket.id,
        ssoUserId: socket.data.billingUserId,
        accountId,
        exchangeId,
        symbol,
        market,
        emitData: (socketId, event) => io.to(socketId).emit('private:data', event),
        emitError: (socketId, event) => io.to(socketId).emit('private:error', event),
        emitHeartbeat: (socketId, event) => io.to(socketId).emit('private:heartbeat', event),
      });
      if (!socket.connected) {
        await stopPrivateSubscription(subscriptionId);
        return;
      }
      ownedPrivateSubscriptions.add(subscriptionId);
      socket.emit('private:subscribed', {
        subscriptionId,
        accountId,
        exchangeId,
        symbol,
        capabilities: subscription.capabilities,
        generation: subscription.runtimeGeneration,
      });
      activatePrivateSubscription(subscriptionId);
    } catch {
      socket.emit('private:error', {
        accountId,
        error: 'Private subscription failed',
        fatal: true,
      });
    } finally {
      pendingPrivateSubscriptions.delete(subscriptionId);
    }
  });

  socket.on('private:unsubscribe', (data) => {
    const subscriptionId = typeof data?.subscriptionId === 'string' ? data.subscriptionId : '';
    if (!subscriptionId || !ownedPrivateSubscriptions.has(subscriptionId)) {
      socket.emit('private:error', { error: 'Unknown private subscription', fatal: true });
      return;
    }
    ownedPrivateSubscriptions.delete(subscriptionId);
    void stopPrivateSubscription(subscriptionId);
    socket.emit('private:unsubscribed', { subscriptionId });
  });

  socket.on('unsubscribe', (data) => {
    const { subscriptionId } = data;
    if (!subscriptionId) {
      socket.emit('unsubscribe_error', { error: 'Missing subscriptionId' });
      return;
    }
    // Teardown is keyed by subscription id alone, so refuse ids this socket does
    // not own — otherwise passing `${otherSocketId}:${key}` kills their stream.
    if (!ownedSubscriptions.has(subscriptionId)) {
      socket.emit('unsubscribe_error', { error: 'Unknown subscription' });
      return;
    }
    ownedSubscriptions.delete(subscriptionId);
    removeSubscriptionFromSocket(socket.id, subscriptionId);
    socket.emit('unsubscribed', { subscriptionId });
  });

  socket.on('disconnect', () => {
    ownedSubscriptions.clear();
    ownedPrivateSubscriptions.clear();
    pendingPrivateSubscriptions.clear();
    removeSocketSubscriptions(socket.id);
    void stopSocketPrivateSubscriptions(socket.id);
  });
});

// Cleanup cache every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// Cleanup expired sessions every hour
setInterval(() => deleteExpiredSessions(db), 60 * 60 * 1000);

console.log(`Profitmaker API server running on port ${PORT} (Elysia/Bun)`);
console.log(`WebSocket server running on port ${PORT + 1} (Socket.IO)`);
console.log(`Health check: http://localhost:${PORT}/health`);
