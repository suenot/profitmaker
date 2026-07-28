import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProviderRequestConfig } from '@profitmaker/types';

/**
 * Unit tests for the leverage endpoints (/leverageMarkets, /fetchLeverages,
 * /setLeverages). Same mocking approach as exchange.accountId.spec.ts: SSO and
 * the central-credential fetch are stubbed, and the provider registry returns a
 * fake instance so nothing touches an exchange.
 *
 * What matters here and is asserted: the write path demands 'trade' access, the
 * batch caps are enforced, and 'max' resolves per pair from the published caps
 * (a pair with no published cap is reported, not silently skipped).
 */

const ssoMock = vi.fn();
vi.mock('../middleware/requireUser', () => ({
  getSsoContextFromRequest: (req: Request) => ssoMock(req),
  getBearerToken: () => null,
  getUserFromRequest: async () => null,
}));

const fetchCredsMock = vi.fn();
vi.mock('../services/authAccounts', async (orig) => {
  const actual = await orig<typeof import('../services/authAccounts')>();
  return { ...actual, fetchCredentials: (args: unknown) => fetchCredsMock(args) };
});

const leverageMarketsMock = vi.fn(async () => [
  { symbol: 'BTC/USDT:USDT', marketType: 'swap', maxLeverage: 125, minLeverage: 1 },
  { symbol: 'ETH/USDT:USDT', marketType: 'swap', maxLeverage: 100, minLeverage: 1 },
  { symbol: 'NOCAP/USDT:USDT', marketType: 'swap', minLeverage: 1 },
]);
const fetchLeveragesMock = vi.fn(async () => [
  { symbol: 'BTC/USDT:USDT', leverage: 10, marginMode: 'cross', source: 'fetchLeverages' },
]);
const setLeverageMock = vi.fn(async (leverage: number, symbol: string) => ({
  symbol, leverage, success: true, message: `Set to ${leverage}x`,
}));

let lastConfig: ProviderRequestConfig | null = null;
vi.mock('../providers', () => ({
  providerRegistry: {
    resolve: async (config: ProviderRequestConfig) => {
      lastConfig = config;
      return {
        providerId: 'ccxt',
        instance: {
          trading: {
            leverageMarkets: leverageMarketsMock,
            fetchLeverages: fetchLeveragesMock,
            setLeverage: setLeverageMock,
          },
        },
      };
    },
  },
}));

const { exchangeRoutes } = await import('./exchange');

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
  fetchCredsMock.mockResolvedValue({
    apiKey: 'K', secret: 'S', accessLevel: 'trade', readOnly: false, credentialId: 'cred-1', ownerUserId: 'o',
  });
});

describe('/leverageMarkets', () => {
  it('returns the published caps with want=read', async () => {
    const { status, json } = await post('/api/exchange/leverageMarkets', {
      accountId: 'cred-1', exchange: 'bybit', market: 'swap', marketType: 'swap',
    });
    expect(status).toBe(200);
    expect(json.data).toHaveLength(3);
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'read' });
    expect(leverageMarketsMock).toHaveBeenCalledWith('swap');
    expect(lastConfig?.exchangeId).toBe('bybit');
  });
});

describe('/fetchLeverages', () => {
  it('passes the requested symbols through and uses want=read', async () => {
    const { status, json } = await post('/api/exchange/fetchLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols: ['BTC/USDT:USDT'],
    });
    expect(status).toBe(200);
    expect(json.data[0]).toMatchObject({ symbol: 'BTC/USDT:USDT', leverage: 10 });
    expect(fetchLeveragesMock).toHaveBeenCalledWith(['BTC/USDT:USDT'], { refresh: undefined });
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'read' });
  });

  it('passes refresh through so a reload bypasses the provider cache', async () => {
    const { status } = await post('/api/exchange/fetchLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols: ['BTC/USDT:USDT'], refresh: true,
    });
    expect(status).toBe(200);
    expect(fetchLeveragesMock).toHaveBeenCalledWith(['BTC/USDT:USDT'], { refresh: true });
  });

  it('refuses a batch over the read cap', async () => {
    const symbols = Array.from({ length: 51 }, (_, i) => `S${i}/USDT:USDT`);
    const { status, json } = await post('/api/exchange/fetchLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols,
    });
    expect(status).toBe(400);
    expect(json).toMatchObject({ error: expect.stringContaining('50 symbols') });
    expect(fetchLeveragesMock).not.toHaveBeenCalled();
  });
});

describe('/setLeverages', () => {
  it('forces want=trade and writes every symbol', async () => {
    const { status, json } = await post('/api/exchange/setLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols: ['BTC/USDT:USDT', 'ETH/USDT:USDT'], leverage: 20,
      // A body asking for read must not be able to downgrade a write.
      want: 'read',
    });
    expect(status).toBe(200);
    expect(fetchCredsMock).toHaveBeenCalledWith({ ssoUserId: 'sso-user-1', credentialId: 'cred-1', want: 'trade' });
    expect(setLeverageMock).toHaveBeenCalledTimes(2);
    expect(setLeverageMock).toHaveBeenCalledWith(20, 'BTC/USDT:USDT');
    expect(json.data).toHaveLength(2);
  });

  it("resolves 'max' per pair and reports pairs with no published cap", async () => {
    const { status, json } = await post('/api/exchange/setLeverages', {
      accountId: 'cred-1', exchange: 'bybit',
      symbols: ['BTC/USDT:USDT', 'NOCAP/USDT:USDT'], leverage: 'max',
    });
    expect(status).toBe(200);
    expect(setLeverageMock).toHaveBeenCalledTimes(1);
    expect(setLeverageMock).toHaveBeenCalledWith(125, 'BTC/USDT:USDT');
    expect(json.data[1]).toMatchObject({
      symbol: 'NOCAP/USDT:USDT', success: false, message: expect.stringContaining('No max leverage'),
    });
  });

  it('dry run touches nothing on the exchange', async () => {
    const { status, json } = await post('/api/exchange/setLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols: ['BTC/USDT:USDT'], leverage: 5, dryRun: true,
    });
    expect(status).toBe(200);
    expect(setLeverageMock).not.toHaveBeenCalled();
    expect(json.data[0]).toMatchObject({ symbol: 'BTC/USDT:USDT', leverage: 5, success: true });
  });

  it('refuses a batch over the write cap', async () => {
    const symbols = Array.from({ length: 21 }, (_, i) => `S${i}/USDT:USDT`);
    const { status, json } = await post('/api/exchange/setLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols, leverage: 10,
    });
    expect(status).toBe(400);
    expect(json).toMatchObject({ error: expect.stringContaining('20 symbols') });
    expect(setLeverageMock).not.toHaveBeenCalled();
  });

  it('rejects a leverage below 1', async () => {
    const { status } = await post('/api/exchange/setLeverages', {
      accountId: 'cred-1', exchange: 'bybit', symbols: ['BTC/USDT:USDT'], leverage: 0,
    });
    expect(status).toBe(400);
    expect(setLeverageMock).not.toHaveBeenCalled();
  });
});
