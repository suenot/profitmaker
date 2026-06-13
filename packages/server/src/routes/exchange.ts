import { Elysia, t } from 'elysia';
import ccxt from 'ccxt';
import { getCCXTInstance, type CCXTInstanceConfig } from '../services/ccxtCache';

const configSchema = t.Object({
  exchangeId: t.String(),
  marketType: t.Optional(t.String()),
  ccxtType: t.Optional(t.Union([t.Literal('regular'), t.Literal('pro')])),
  apiKey: t.Optional(t.String()),
  secret: t.Optional(t.String()),
  password: t.Optional(t.String()),
  sandbox: t.Optional(t.Boolean()),
});

// Trading requests carry credentials in `config` (same shape as fetchBalance);
// the server stays stateless about user accounts.
const configWithCreds = t.Object({ config: configSchema });

function requireCreds(config: CCXTInstanceConfig, set: { status?: number }): string | null {
  if (!config.apiKey || !config.secret) {
    set.status = 400;
    return 'API credentials required for this operation';
  }
  return null;
}

const configWithSymbol = t.Object({
  config: configSchema,
  symbol: t.String(),
});

const configWithSymbolAndLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  limit: t.Optional(t.Number()),
});

const configWithSymbolTimeframeLimit = t.Object({
  config: configSchema,
  symbol: t.String(),
  timeframe: t.Optional(t.String()),
  limit: t.Optional(t.Number()),
});

const configOnly = t.Object({
  config: configSchema,
});

// Which provider served a response. Today everything is the built-in ccxt path;
// the forthcoming server ProviderRegistry (task #13) will set this from
// registry.resolve(exchange, providerId?). Clients/agents can read `provider`
// to know the source without a wire-format change later.
const BUILTIN_PROVIDER = 'ccxt';

export const exchangeRoutes = new Elysia({ prefix: '/api/exchange' })
  .post('/instance', async ({ body }) => {
    const config = body as CCXTInstanceConfig;
    if (!config.exchangeId) return { error: 'exchangeId is required' };
    await getCCXTInstance(config);
    return {
      success: true,
      exchangeId: config.exchangeId,
      marketType: config.marketType || 'spot',
      ccxtType: config.ccxtType || 'regular',
      sandbox: config.sandbox || false,
      hasCredentials: !!(config.apiKey && config.secret),
    };
  }, { body: configSchema })

  .post('/fetchTicker', async ({ body }) => {
    const { config, symbol } = body;
    const instance = await getCCXTInstance(config);
    const ticker = await instance.fetchTicker(symbol);
    return { success: true, provider: BUILTIN_PROVIDER, data: ticker };
  }, { body: configWithSymbol })

  .post('/fetchOrderBook', async ({ body }) => {
    const { config, symbol, limit } = body;
    const instance = await getCCXTInstance(config);
    const orderbook = await instance.fetchOrderBook(symbol, limit);
    return { success: true, provider: BUILTIN_PROVIDER, data: orderbook };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchTrades', async ({ body }) => {
    const { config, symbol, limit } = body;
    const instance = await getCCXTInstance(config);
    const trades = await instance.fetchTrades(symbol, undefined, limit);
    return { success: true, provider: BUILTIN_PROVIDER, data: trades };
  }, { body: configWithSymbolAndLimit })

  .post('/fetchOHLCV', async ({ body }) => {
    const { config, symbol, timeframe, limit } = body;
    const instance = await getCCXTInstance(config);
    const ohlcv = await instance.fetchOHLCV(symbol, timeframe, undefined, limit);
    return { success: true, provider: BUILTIN_PROVIDER, data: ohlcv };
  }, { body: configWithSymbolTimeframeLimit })

  .post('/fetchBalance', async ({ body, set }) => {
    const { config } = body;
    if (!config.apiKey || !config.secret) {
      set.status = 400;
      return { error: 'API credentials required for balance' };
    }
    const instance = await getCCXTInstance(config);
    const balance = await instance.fetchBalance();
    return { success: true, provider: BUILTIN_PROVIDER, data: balance };
  }, { body: configOnly })

  .post('/capabilities', async ({ body }) => {
    const { config } = body;
    const instance = await getCCXTInstance(config);
    return {
      success: true,
      provider: BUILTIN_PROVIDER,
      data: {
        has: instance.has,
        markets: Object.keys(instance.markets || {}),
        symbols: instance.symbols || [],
        timeframes: instance.timeframes || {},
        fees: instance.fees || {},
      },
    };
  }, { body: configOnly })

  // List every exchange id CCXT knows about. Used by useExchangesList and the
  // provider discovery path now that the browser CCXT bundle is gone.
  .get('/list', () => ({ success: true, provider: BUILTIN_PROVIDER, data: (ccxt as any).exchanges as string[] }))

  // Single market's full metadata (limits/precision) for order validation.
  .post('/market', async ({ body }) => {
    const { config, symbol } = body;
    const instance = await getCCXTInstance(config);
    const market = instance.markets?.[symbol] ?? null;
    return { success: true, provider: BUILTIN_PROVIDER, data: market };
  }, { body: configWithSymbol })

  // --- authenticated trading (credentials travel in `config`) --------------

  .post('/createOrder', async ({ body, set }) => {
    const { config, symbol, type, side, amount, price, params } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    const order = await instance.createOrder(symbol, type, side, amount, price, params || {});
    return { success: true, provider: BUILTIN_PROVIDER, data: order };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.String(),
      type: t.String(),
      side: t.Union([t.Literal('buy'), t.Literal('sell')]),
      amount: t.Number(),
      price: t.Optional(t.Number()),
      params: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })

  .post('/cancelOrder', async ({ body, set }) => {
    const { config, orderId, symbol } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    const result = await instance.cancelOrder(orderId, symbol);
    return { success: true, provider: BUILTIN_PROVIDER, data: result };
  }, {
    body: t.Object({
      config: configSchema,
      orderId: t.String(),
      symbol: t.String(),
    }),
  })

  .post('/fetchMyTrades', async ({ body, set }) => {
    const { config, symbol, since, limit } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    if (!instance.has?.fetchMyTrades) return { success: true, provider: BUILTIN_PROVIDER, data: [] };
    const trades = await instance.fetchMyTrades(symbol, since, limit);
    return { success: true, provider: BUILTIN_PROVIDER, data: trades };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
    }),
  })

  .post('/fetchOrders', async ({ body, set }) => {
    const { config, symbol, since, limit } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    if (!instance.has?.fetchOrders) return { success: true, provider: BUILTIN_PROVIDER, data: [] };
    const orders = await instance.fetchOrders(symbol, since, limit);
    return { success: true, provider: BUILTIN_PROVIDER, data: orders };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
    }),
  })

  .post('/fetchOpenOrders', async ({ body, set }) => {
    const { config, symbol } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    if (!instance.has?.fetchOpenOrders) return { success: true, provider: BUILTIN_PROVIDER, data: [] };
    const orders = await instance.fetchOpenOrders(symbol);
    return { success: true, provider: BUILTIN_PROVIDER, data: orders };
  }, {
    body: t.Object({
      config: configSchema,
      symbol: t.Optional(t.String()),
    }),
  })

  .post('/fetchPositions', async ({ body, set }) => {
    const { config, symbols } = body;
    const credErr = requireCreds(config, set);
    if (credErr) return { error: credErr };
    const instance = await getCCXTInstance(config);
    if (!instance.has?.fetchPositions) return { success: true, provider: BUILTIN_PROVIDER, data: [] };
    const positions = await instance.fetchPositions(symbols);
    return { success: true, provider: BUILTIN_PROVIDER, data: positions };
  }, {
    body: t.Object({
      config: configSchema,
      symbols: t.Optional(t.Array(t.String())),
    }),
  })

  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Map known CCXT errors to appropriate HTTP codes
    if (message.includes('not found')) {
      set.status = 404;
    } else if (message.includes('not available') || message.includes('not supported')) {
      set.status = 400;
    } else {
      set.status = 500;
    }
    return { error: 'Exchange operation failed', details: message };
  });
