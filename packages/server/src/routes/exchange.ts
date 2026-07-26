import { Elysia, t } from 'elysia';
import ccxt from 'ccxt';
import type {
  ProviderRequestConfig,
  LeverageMarketType,
  SetLeverageResult,
} from '@profitmaker/types';
import { providerRegistry } from '../providers';
import { getSsoContextFromRequest } from '../middleware/requireUser';
import {
  fetchCredentials,
  AuthAccountsError,
  type AccessWant,
} from '../services/authAccounts';

// Leverage batch limits. Both directions are capped per request so a call can't
// run past the client's 30s HTTP timeout. Writes get a much smaller cap: each
// one is a round-trip to the exchange plus the pacing delay below, which keeps
// bulk runs under exchange rate limits (the cadence the standalone tooling uses).
const MAX_LEVERAGE_READ_BATCH = 50;
const MAX_LEVERAGE_WRITE_BATCH = 20;
const LEVERAGE_WRITE_DELAY_MS = 100;

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

// Central-accounts fields, accepted on every authenticated endpoint alongside
// the legacy inline `config`. When `accountId` is present the server resolves the
// real keys server-side (browser sends NO secrets); the inline-config path is
// kept working transitionally for incremental client migration.
//
// Routing fields (`exchange`/`market`/`sandbox`) are ALSO accepted top-level as a
// convenience for the accountId flow, so the client can send a flat body without
// re-wrapping a secret-free `config`. They map to config.exchangeId/marketType/
// sandbox; an inner `config` still wins per-field when both are present.
const accountIdField = {
  accountId: t.Optional(t.String()),
  want: t.Optional(t.Union([t.Literal('trade'), t.Literal('read')])),
  exchange: t.Optional(t.String()),
  market: t.Optional(t.String()),
  sandbox: t.Optional(t.Boolean()),
};

function requireCreds(config: ProviderRequestConfig, set: { status?: number | string }): string | null {
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

interface AuthedBody {
  config?: ProviderRequestConfig;
  accountId?: string;
  want?: AccessWant;
  // Flat routing convenience fields (accountId flow). Mapped into the config.
  exchange?: string;
  market?: string;
  sandbox?: boolean;
}

/**
 * Build the routing config from either an inner `config` object or the flat
 * top-level convenience fields (`exchange`/`market`/`sandbox`). Inner-config
 * fields win when both are present. Secrets are intentionally NOT carried here;
 * they're attached only by the accountId path after the server-side fetch.
 */
function routingConfig(body: AuthedBody): ProviderRequestConfig {
  const c = body.config ?? ({} as ProviderRequestConfig);
  return {
    // Routing-only: exchange id, market type, sandbox, ccxt type. Secrets are
    // deliberately excluded so callers attach them explicitly (fetched keys on
    // the accountId path, inline keys on the legacy path) and never leak across.
    exchangeId: c.exchangeId ?? body.exchange ?? '',
    marketType: c.marketType ?? body.market,
    ccxtType: c.ccxtType,
    sandbox: c.sandbox ?? body.sandbox,
  };
}

/**
 * Build the CCXT request config for an authenticated endpoint, honoring both the
 * central-accounts path and the legacy inline-secret path.
 *
 *  - `accountId` present (preferred): fetch decrypted keys from auth server-side
 *    at the required access level and merge them into a secret-free `config`. Any
 *    secrets the client happened to send inline are IGNORED on this path.
 *  - else: fall back to the inline `config.apiKey/secret/password` (legacy).
 *
 * `required` is 'trade' for order placement/cancel and 'read' for private reads.
 * On the accountId path with required='trade', a read-only/read-grant credential
 * is refused (403) by fetchCredentials. On the legacy path no central access
 * decision exists, so the usual `requireCreds` check applies at the call site.
 *
 * Returns null on success (writing into `set` on failure), or a config to use.
 */
async function resolveAuthedConfig(
  request: Request,
  body: AuthedBody,
  required: AccessWant,
  set: { status?: number | string },
): Promise<{ config: ProviderRequestConfig } | { error: string }> {
  const base = routingConfig(body);
  if (!base.exchangeId) {
    set.status = 400;
    return { error: 'exchangeId (config.exchangeId or top-level exchange) is required' };
  }

  if (body.accountId) {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) {
      set.status = 401;
      return { error: 'SSO authentication required for accountId access' };
    }
    // Trading endpoints force want='trade'; reads honor an explicit want but
    // never need more than 'read'. Never let a body downgrade a trade op.
    const want: AccessWant = required === 'trade' ? 'trade' : (body.want ?? 'read');
    try {
      const creds = await fetchCredentials({
        ssoUserId: ctx.ssoUserId,
        credentialId: body.accountId,
        want,
      });
      return {
        config: {
          // Trust only the server-fetched keys on the accountId path; `base`
          // never carries inline secrets (routingConfig drops them).
          ...base,
          apiKey: creds.apiKey,
          secret: creds.secret,
          password: creds.password,
        },
      };
    } catch (err) {
      if (err instanceof AuthAccountsError) {
        set.status = err.status;
        return { error: err.message };
      }
      set.status = 502;
      return { error: 'failed to resolve account credentials' };
    }
  }

  // Legacy inline-config path: keep any inline secrets the client sent in `config`
  // (the only place secrets live on this path), merged onto the routing base.
  return { config: { ...base, apiKey: body.config?.apiKey, secret: body.config?.secret, password: body.config?.password } };
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

// Like configOnly, but also accepts the central-accounts {accountId, want} and
// the flat routing fields. `config` is optional here: the accountId flow may send
// routing top-level instead of wrapping a (secret-free) config object.
const authedConfigOnly = t.Object({
  config: t.Optional(configSchema),
  ...providerIdField,
  ...accountIdField,
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

  .post('/fetchBalance', async ({ body, request, set }) => {
    const { providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    return { success: true, provider: served, data: await instance.fetchBalance() };
  }, { body: authedConfigOnly })

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

  .post('/createOrder', async ({ body, request, set }) => {
    const { symbol, type, side, amount, price, params, providerId } = body;
    // Trade-level: accountId path forces want='trade' and 403s on read-only.
    const resolved = await resolveAuthedConfig(request, body, 'trade', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    if (!instance.trading) { set.status = 400; return { error: `provider '${served}' has no trading support` }; }
    const order = await instance.trading.createOrder(symbol, type, side, amount, price, params || {});
    return { success: true, provider: served, data: order };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbol: t.String(),
      type: t.String(),
      side: t.Union([t.Literal('buy'), t.Literal('sell')]),
      amount: t.Number(),
      price: t.Optional(t.Number()),
      params: t.Optional(t.Record(t.String(), t.Any())),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/cancelOrder', async ({ body, request, set }) => {
    const { orderId, symbol, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'trade', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    if (!instance.trading) { set.status = 400; return { error: `provider '${served}' has no trading support` }; }
    return { success: true, provider: served, data: await instance.trading.cancelOrder(orderId, symbol) };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      orderId: t.String(),
      symbol: t.String(),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchMyTrades', async ({ body, request, set }) => {
    const { symbol, since, limit, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    const trades = instance.trading ? await instance.trading.fetchMyTrades(symbol, since, limit) : [];
    return { success: true, provider: served, data: trades };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchOrders', async ({ body, request, set }) => {
    const { symbol, since, limit, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    const orders = instance.trading ? await instance.trading.fetchOrders(symbol, since, limit) : [];
    return { success: true, provider: served, data: orders };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbol: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchOpenOrders', async ({ body, request, set }) => {
    const { symbol, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    const orders = instance.trading ? await instance.trading.fetchOpenOrders(symbol) : [];
    return { success: true, provider: served, data: orders };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbol: t.Optional(t.String()),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchPositions', async ({ body, request, set }) => {
    const { symbols, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    const positions = instance.trading ? await instance.trading.fetchPositions(symbols) : [];
    return { success: true, provider: served, data: positions };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbols: t.Optional(t.Array(t.String())),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchLedger', async ({ body, request, set }) => {
    const { code, since, limit, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    const { instance, providerId: served } = await resolve(config, providerId);
    const entries = instance.trading ? await instance.trading.fetchLedger(code, since, limit) : [];
    return { success: true, provider: served, data: entries };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      code: t.Optional(t.String()),
      since: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/leverageMarkets', async ({ body, request, set }) => {
    const { marketType, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    const { instance, providerId: served } = await resolve(config, providerId);
    const markets = instance.trading
      ? await instance.trading.leverageMarkets(marketType as LeverageMarketType | undefined)
      : [];
    return { success: true, provider: served, data: markets };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      marketType: t.Optional(t.Union([t.Literal('swap'), t.Literal('future')])),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  .post('/fetchLeverages', async ({ body, request, set }) => {
    const { symbols, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'read', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    if (symbols && symbols.length > MAX_LEVERAGE_READ_BATCH) {
      set.status = 400;
      return { error: `at most ${MAX_LEVERAGE_READ_BATCH} symbols per request` };
    }
    const { instance, providerId: served } = await resolve(config, providerId);
    const leverages = instance.trading ? await instance.trading.fetchLeverages(symbols) : [];
    return { success: true, provider: served, data: leverages };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbols: t.Optional(t.Array(t.String())),
      ...providerIdField,
      ...accountIdField,
    }),
  })

  // Bulk leverage write. Capped per request so a call stays inside the HTTP
  // timeout — the client chunks a full-exchange run and shows progress. Symbols
  // are processed sequentially with a small delay: exchanges rate-limit this
  // endpoint hard, and a burst gets the whole batch rejected.
  .post('/setLeverages', async ({ body, request, set }) => {
    const { symbols, leverage, dryRun, providerId } = body;
    const resolved = await resolveAuthedConfig(request, body, 'trade', set);
    if ('error' in resolved) return resolved;
    const { config } = resolved;
    if (!body.accountId) { const credErr = requireCreds(config, set); if (credErr) return { error: credErr }; }
    if (!symbols.length) return { success: true, provider: null, data: [] };
    if (symbols.length > MAX_LEVERAGE_WRITE_BATCH) {
      set.status = 400;
      return { error: `at most ${MAX_LEVERAGE_WRITE_BATCH} symbols per request` };
    }
    if (leverage !== 'max' && !(leverage >= 1)) {
      set.status = 400;
      return { error: 'leverage must be a number >= 1 or "max"' };
    }

    const { instance, providerId: served } = await resolve(config, providerId);
    if (!instance.trading) return { error: 'provider does not support trading' };

    // 'max' resolves per symbol against the exchange's own published cap.
    let caps: Map<string, number> | null = null;
    if (leverage === 'max') {
      const markets = await instance.trading.leverageMarkets();
      caps = new Map(markets.filter(m => m.maxLeverage).map(m => [m.symbol, Math.floor(m.maxLeverage!)]));
    }

    const results: SetLeverageResult[] = [];
    for (const symbol of symbols) {
      const target = leverage === 'max' ? caps?.get(symbol) : leverage;
      if (!target || target < 1) {
        results.push({ symbol, leverage: 0, success: false, message: 'No max leverage published for this pair' });
        continue;
      }
      if (dryRun) {
        results.push({ symbol, leverage: target, success: true, message: `Would set to ${target}x` });
        continue;
      }
      results.push(await instance.trading.setLeverage(target, symbol));
      await new Promise(r => setTimeout(r, LEVERAGE_WRITE_DELAY_MS));
    }
    return { success: true, provider: served, data: results };
  }, {
    body: t.Object({
      config: t.Optional(configSchema),
      symbols: t.Array(t.String()),
      leverage: t.Union([t.Number(), t.Literal('max')]),
      dryRun: t.Optional(t.Boolean()),
      ...providerIdField,
      ...accountIdField,
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
