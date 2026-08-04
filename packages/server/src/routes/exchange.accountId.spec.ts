import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderRequestConfig } from '@profitmaker/types';
import { PermissionDenied } from 'ccxt';

/**
 * Unit tests for the /api/exchange/* accountId resolution path
 * (resolveAuthedConfig, exercised through the Elysia route handlers).
 *
 * Collaborators are mocked so nothing hits the network or the db:
 *  - ../middleware/requireUser → getSsoContextFromRequest (SSO identity)
 *  - ../services/authAccounts  → fetchCredentials (server-side key fetch)
 *  - ../providers → providerRegistry.resolve returns a fake instance that
 *    CAPTURES the config it was built with, so we can assert which keys (if any)
 *    reached CCXT and that trading ops ran.
 *
 * No real exchange is contacted; all credential literals are dummies.
 */

// --- mock the SSO middleware ---------------------------------------------------
const ssoMock = vi.fn();
vi.mock('../middleware/requireUser', () => ({
  getSsoContextFromRequest: (req: Request) => ssoMock(req),
  // exchange.ts only imports getSsoContextFromRequest; provide the others as
  // no-ops in case the import surface widens.
  getBearerToken: () => null,
  getUserFromRequest: async () => null,
}));

// --- mock the central-accounts credential fetch -------------------------------
const fetchCredsMock = vi.fn();
vi.mock('../services/authAccounts', async (orig) => {
  const actual = await orig<typeof import('../services/authAccounts')>();
  return {
    ...actual, // keep the real AuthAccountsError class for instanceof + status mapping
    fetchCredentials: (args: unknown) => fetchCredsMock(args),
  };
});

// --- mock the provider registry to capture the resolved config ----------------
let lastConfig: ProviderRequestConfig | null = null;
const createOrderMock = vi.fn(async () => ({ id: 'order-1', status: 'open' }));
const cancelOrderMock = vi.fn(async () => ({ id: 'order-1', status: 'canceled' }));
const fetchBalanceMock = vi.fn(async () => ({ total: { USDT: 100 } }));
const fetchMyTradesMock = vi.fn(async () => []);
const fetchOpenOrdersMock = vi.fn(async () => []);
vi.mock('../providers', () => ({
  providerRegistry: {
    resolve: async (config: ProviderRequestConfig) => {
      lastConfig = config;
      return {
        providerId: 'ccxt',
        instance: {
          fetchBalance: fetchBalanceMock,
          trading: {
            createOrder: createOrderMock,
            cancelOrder: cancelOrderMock,
            fetchMyTrades: fetchMyTradesMock,
            fetchOpenOrders: fetchOpenOrdersMock,
          },
        },
      };
    },
  },
}));

// Import AFTER the mocks are registered.
const { exchangeRoutes } = await import('./exchange');
const { AuthAccountsError } = await import('../services/authAccounts');

/** POST helper through the Elysia app. */
async function post(path: string, body: unknown, auth = 'Bearer test') {
  const res = await exchangeRoutes.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(body),
    }),
  );
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

beforeEach(() => {
  vi.clearAllMocks();
  lastConfig = null;
  ssoMock.mockResolvedValue({ ssoUserId: 'sso-user-1', bearer: 'JWT' });
});

describe('createOrder — accountId path (trade enforcement)', () => {
  it('fetches creds server-side with want=trade and runs the order; inline secrets are stripped', async () => {
    fetchCredsMock.mockResolvedValue({
      apiKey: 'FETCHED_KEY', secret: 'FETCHED_SEC', password: undefined,
      accessLevel: 'trade', readOnly: false, credentialId: 'cred-1', ownerUserId: 'o',
    });

    const { status, json } = await post('/api/exchange/createOrder', {
      // client sends a secret-free config + accountId; even if a stray inline
      // secret were present, it must NOT reach the provider.
      config: { exchangeId: 'bingx', marketType: 'swap', apiKey: 'INLINE_SHOULD_BE_DROPPED' },
      accountId: 'cred-1',
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });

    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true, data: { id: 'order-1' } });
    // want is forced to 'trade' for createOrder regardless of body.
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'trade' });
    // The provider got the FETCHED keys, not the inline one.
    expect(lastConfig?.apiKey).toBe('FETCHED_KEY');
    expect(lastConfig?.secret).toBe('FETCHED_SEC');
    expect(createOrderMock).toHaveBeenCalledOnce();
  });

  it('rejects with 403 when fetchCredentials throws a read-only AuthAccountsError', async () => {
    fetchCredsMock.mockRejectedValue(
      new AuthAccountsError(403, 'account is read-only; trading is not permitted', 'read', true),
    );

    const { status, json } = await post('/api/exchange/createOrder', {
      config: { exchangeId: 'bingx', marketType: 'swap' },
      accountId: 'cred-ro',
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });

    expect(status).toBe(403);
    expect(json).toMatchObject({ error: expect.stringContaining('read-only') });
    expect(createOrderMock).not.toHaveBeenCalled(); // never reached the exchange
  });

  it('rejects with 401 when there is no SSO identity on the request', async () => {
    ssoMock.mockResolvedValue(null);
    const { status, json } = await post('/api/exchange/createOrder', {
      config: { exchangeId: 'bingx' }, accountId: 'cred-1',
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });
    expect(status).toBe(401);
    expect(json).toMatchObject({ error: expect.stringContaining('SSO') });
    expect(fetchCredsMock).not.toHaveBeenCalled();
  });

  it('returns 400 when neither config.exchangeId nor top-level exchange is provided', async () => {
    const { status } = await post('/api/exchange/createOrder', {
      accountId: 'cred-1', symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });
    expect(status).toBe(400);
    expect(fetchCredsMock).not.toHaveBeenCalled();
  });

  it('preserves Elysia schema validation errors', async () => {
    const { status } = await post('/api/exchange/createOrder', {
      accountId: 'cred-1', exchange: 'bingx',
    });

    expect(status).toBe(422);
    expect(fetchCredsMock).not.toHaveBeenCalled();
  });

  it('accepts the flat shape (top-level exchange/market) and maps it into the config', async () => {
    fetchCredsMock.mockResolvedValue({
      apiKey: 'K', secret: 'S', accessLevel: 'trade', readOnly: false, credentialId: 'c', ownerUserId: 'o',
    });
    const { status } = await post('/api/exchange/createOrder', {
      accountId: 'cred-1', exchange: 'bingx', market: 'swap',
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });
    expect(status).toBe(200);
    expect(lastConfig?.exchangeId).toBe('bingx');
    expect(lastConfig?.marketType).toBe('swap');
  });
});

describe('cancelOrder — accountId path forces want=trade', () => {
  it('fetches with want=trade', async () => {
    fetchCredsMock.mockResolvedValue({
      apiKey: 'K', secret: 'S', accessLevel: 'trade', readOnly: false, credentialId: 'c', ownerUserId: 'o',
    });
    const { status } = await post('/api/exchange/cancelOrder', {
      config: { exchangeId: 'bingx' }, accountId: 'cred-1', orderId: 'order-1', symbol: 'BTC/USDT:USDT',
    });
    expect(status).toBe(200);
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'trade' });
    expect(cancelOrderMock).toHaveBeenCalledOnce();
  });
});

describe('fetchBalance — accountId path uses want=read', () => {
  it('fetches with want=read and returns the balance', async () => {
    fetchCredsMock.mockResolvedValue({
      apiKey: 'ROK', secret: 'ROS', accessLevel: 'read', readOnly: true, credentialId: 'c', ownerUserId: 'o',
    });
    const { status, json } = await post('/api/exchange/fetchBalance', {
      config: { exchangeId: 'bingx', marketType: 'swap' }, accountId: 'cred-1', want: 'read',
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'read' });
    expect(fetchBalanceMock).toHaveBeenCalledOnce();
  });

  it('a read account can still call fetchBalance (read is sufficient)', async () => {
    fetchCredsMock.mockResolvedValue({
      apiKey: 'ROK', secret: 'ROS', accessLevel: 'read', readOnly: true, credentialId: 'c', ownerUserId: 'o',
    });
    const { status } = await post('/api/exchange/fetchBalance', {
      config: { exchangeId: 'bingx' }, accountId: 'cred-1',
    });
    expect(status).toBe(200);
    // want defaults to 'read' on a read endpoint when omitted.
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'read' });
  });
});

describe('private read exchange failures', () => {
  it.each([
    ['/api/exchange/fetchMyTrades', fetchMyTradesMock],
    ['/api/exchange/fetchOpenOrders', fetchOpenOrdersMock],
  ])('returns an actionable, sanitized IP error from %s', async (path, exchangeCall) => {
    exchangeCall.mockRejectedValueOnce(new PermissionDenied(
      'bybit {"retCode":10010,"retMsg":"Unmatched IP, please check bound IP",' +
      '"apiKey":"MUST_NOT_LEAK"}',
    ));
    fetchCredsMock.mockResolvedValue({
      apiKey: 'K', secret: 'S', accessLevel: 'read', readOnly: true,
      credentialId: 'c', ownerUserId: 'o',
    });

    const { status, json } = await post(path, {
      accountId: 'cred-1', exchange: 'bybit', want: 'read',
    });

    expect(status).toBe(403);
    expect(json).toEqual({
      error: "Exchange rejected the API key IP address. Check the key's IP whitelist and the server egress IP.",
      code: 'EXCHANGE_IP_NOT_ALLOWED',
    });
    expect(JSON.stringify(json)).not.toContain('MUST_NOT_LEAK');
    expect(JSON.stringify(json)).not.toContain('retCode');
  });

  it('keeps unknown failures as sanitized internal errors', async () => {
    fetchMyTradesMock.mockRejectedValueOnce(new Error('database password MUST_NOT_LEAK'));

    const { status, json } = await post('/api/exchange/fetchMyTrades', {
      accountId: 'cred-1', exchange: 'bybit', want: 'read',
    });

    expect(status).toBe(500);
    expect(json).toEqual({
      error: 'Exchange operation failed.',
      code: 'EXCHANGE_OPERATION_FAILED',
    });
    expect(JSON.stringify(json)).not.toContain('MUST_NOT_LEAK');
  });
});

describe('legacy inline-config path (no accountId) still works', () => {
  it('createOrder with inline apiKey/secret runs WITHOUT fetching central creds', async () => {
    const { status, json } = await post('/api/exchange/createOrder', {
      config: { exchangeId: 'bingx', apiKey: 'INLINE_KEY', secret: 'INLINE_SEC' },
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true, data: { id: 'order-1' } });
    expect(fetchCredsMock).not.toHaveBeenCalled(); // legacy path: no central fetch
    expect(ssoMock).not.toHaveBeenCalled(); // legacy path: no SSO requirement
    expect(lastConfig?.apiKey).toBe('INLINE_KEY');
    expect(lastConfig?.secret).toBe('INLINE_SEC');
  });

  it('createOrder with inline config but NO credentials returns 400', async () => {
    const { status, json } = await post('/api/exchange/createOrder', {
      config: { exchangeId: 'bingx' },
      symbol: 'BTC/USDT:USDT', type: 'limit', side: 'buy', amount: 0.01, price: 50000,
    });
    expect(status).toBe(400);
    expect(json).toMatchObject({ error: expect.stringContaining('credentials') });
    expect(createOrderMock).not.toHaveBeenCalled();
  });
});
