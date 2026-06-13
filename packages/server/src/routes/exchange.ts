import { Elysia, t } from 'elysia';
import ccxt from 'ccxt';
import type { ProviderRequestConfig } from '@profitmaker/types';
import { providerRegistry } from '../providers';

const configSchema = t.Object({
  exchangeId: t.String(),
  marketType: t.Optional(t.String()),
  ccxtType: t.Optional(t.Union([t.Literal('regular'), t.Literal('pro')])),
  apiKey: t.Optional(t.String()),
  secret: t.Optional(t.String()),
  password: t.Optional(t.String()),
  sandbox: t.Optional(t.Boolean()),
});

// Optional explicit provider selection; omitted ⇒ registry picks by priority.
const providerIdField = { providerId: t.Optional(t.String()) };

function requireCreds(config: ProviderRequestConfig, set: { status?: number }): string | null {
  if (!config.apiKey || !config.secret) {
    set.status = 400;
    return 'API credentials required for this operation';
  }
  return null;
}

/** Resolve a provider instance for a request, returning it + the resolved id. */
async function resolve(config: ProviderRequestConfig, providerId?: string) {
  return providerRegistry.resolve(config, providerId);
}

const configWithSymbol = t.Object({
  config: configSchema,
  symbol: t.String(),
  ...providerIdField,
});

const configWithSymbolAndLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  limit: t.Optional(t.Number()),
  ...providerIdField,
});

const configWithSymbolTimeframeLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  timeframe: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
  ...providerIdField,
});

const configOnly = t.Object({
  config: configSchema,
  ...providerIdField,
});

export const exchangeRoutes = new Elysia({ prefix: '/api/exchange' })
  .post('/instance', async ({ body }) => {
    // NOTE: /instance takes the bare config as the body. The client's
    // CCXTInstanceConfig carries its own `providerId` (the *client* provider id,
    // e.g. 'primary-server') which is NOT a server-registry id — so we resolve
    // by priority here and ignore any providerId on the config. Explicit
    // server-provider selection happens on the data endpoints via the
    // top-level `providerId` field.
    const config = body as ProviderRequestConfig;
    if (!config.exchangeId) return { error: 'exchangeId is required' };
    // Instantiate (and cache) the provider instance; surfaces config errors early.
    const { providerId } = await resolve(config);
    return {
      success: true,
      provider: providerId,
      exchangeId: config.exchangeId,
      marketType: config.marketType || 'spot',
      ccxtType: config.ccxtType || 'regular',
      sandbox: config.sandbox || false,
      hasCredentials: !!(config.apiKey && config.secret),
    };
  }, { body: t.Object({ ...configSchema.properties }, { additionalProperties: true }) })

  .post('/fetchTicker', async ({ body }) => {
    const { config, symbol, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchTicker(symbol) };
  }, { body: configWithSymbol })

  .post('/fetchOrderBook', async ({ body }) => {
    const { config, symbol, limit, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchOrderBook(symbol, limit) };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchTrades', async ({ body }) => {
    const { config, symbol, limit, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchTrades(symbol, undefined, limit) };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchOHLCV', async ({ body }) => {
    const { config, symbol, timeframe, limit, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchOHLCV(symbol, timeframe ?? '1m', undefined, limit) };
  }, { body: configWithSymbolTimeframeLimit })

  .post('/fetchBalance', async ({ body, set }) => {
    const { config, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchBalance() };
  }, { body: configOnly })

  .post('/capabilities', async ({ body }) => {
    const { config, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.getCapabilities() };
  }, { body: configOnly })

  // List every exchange id CCXT knows about. Used by useExchangesList and the
  // provider discovery path now that the browser CCXT bundle is gone.
  .get('/list', () => ({ success: true, provider: 'ccxt', data: (ccxt as any).exchanges as string[] }))

  // Single market's full metadata (limits/precision) for order validation.
  .post('/market', async ({ body }) => {
    const { config, symbol, providerId } = body;
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.getMarket(symbol) };
  }, { body: configWithSymbol })

  // --- authenticated trading (credentials travel in `config`) --------------

  .post('/createOrder', async ({ body, set }) => {
    const { config, symbol, type, side, amount, price, params, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    if (!instance.trading) { set.status = 400; return { error: `provider '${served}' has no trading support` }; }
    const order = await instance.trading.createOrder(symbol, type, side, amount, price, params || {});
    return { success: true, provider: served, data: order };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.String(),
      type: t.String(),
      side: t.Union([t.Literal('buy'), t.Literal('sell')]),
      amount: t.Number(),
      price: t.Optional(t.Number()),
      params: t.Optional(t.Record(t.String(), t.Any())),
      ...providerIdField,
    }),
  })

  .post('/cancelOrder', async ({ body, set }) => {
    const { config, orderId, symbol, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    if (!instance.trading) { set.status = 400; return { error: `provider '${served}' has no trading support` }; }
    return { success: true, provider: served, data: await instance.trading.cancelOrder(orderId, symbol) };
  }, {
    body: t.Object({
      config: configSchema,
      orderId: t.String(),
      symbol: t.String(),
      ...providerIdField,
    }),
  })

  .post('/fetchMyTrades', async ({ body, set }) => {
    const { config, symbol, since, limit, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    const trades = instance.trading ? await instance.trading.fetchMyTrades(symbol, since, limit) : [];
    return { success: true, provider: served, data: trades };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      ...providerIdField,
    }),
  })

  .post('/fetchOrders', async ({ body, set }) => {
    const { config, symbol, since, limit, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    const orders = instance.trading ? await instance.trading.fetchOrders(symbol, since, limit) : [];
    return { success: true, provider: served, data: orders };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      ...providerIdField,
    }),
  })

  .post('/fetchOpenOrders', async ({ body, set }) => {
    const { config, symbol, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    const orders = instance.trading ? await instance.trading.fetchOpenOrders(symbol) : [];
    return { success: true, provider: served, data: orders };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
      ...providerIdField,
    }),
  })

  .post('/fetchPositions', async ({ body, set }) => {
    const { config, symbols, providerId } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const { instance, providerId: served } = await resolve(config, providerId);
    const positions = instance.trading ? await instance.trading.fetchPositions(symbols) : [];
    return { success: true, provider: served, data: positions };
  }, {
    body: t.Object({
      config: configSchema,
      symbols: t.Optional(t.Array(t.String())),
      ...providerIdField,
    }),
  })

  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Map known CCXT/registry errors to appropriate HTTP codes
    if (message.includes('not found')) {
      set.status = 404;
    } else if (message.includes('not available') || message.includes('not supported') || message.includes('does not support')) {
      set.status = 400;
    } else {
      set.status = 500;
    }
    return { error: 'Exchange operation failed', details: message };
  });
