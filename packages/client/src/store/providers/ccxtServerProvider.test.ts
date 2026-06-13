import { afterEach, describe, expect, test, vi } from 'vitest';
import { createCCXTServerProvider, deriveSocketUrl } from './ccxtServerProvider';
import type { CCXTServerProvider } from '../../types/dataProviders';

describe('deriveSocketUrl', () => {
  test('uses the next port for explicit local server URLs', () => {
    expect(deriveSocketUrl('http://localhost:3001')).toBe('http://localhost:3002');
    expect(deriveSocketUrl('http://127.0.0.1:4000/')).toBe('http://127.0.0.1:4001');
  });

  test('keeps reverse-proxied URLs without explicit ports unchanged', () => {
    expect(deriveSocketUrl('https://api.profitmaker.cc')).toBe('https://api.profitmaker.cc');
  });

  test('falls back to trimming invalid URLs', () => {
    expect(deriveSocketUrl('not-a-url/')).toBe('not-a-url');
  });
});

// Regression test for the market-data freeze (task #15): the one-shot (no-onData)
// watch* methods must return the orderbook/candles directly. makeRequest already
// unwraps the {success,data} envelope to `data`; the methods previously returned
// `response.data`, double-unwrapping to `undefined` so every poll was discarded
// and the orderbook/chart UI froze after the initial REST seed.
describe('createExchangeProxy one-shot watch* methods (no onData)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeProvider = (): CCXTServerProvider => ({
    id: 'test-server',
    type: 'ccxt-server',
    name: 'Test Server',
    status: 'connected',
    exchanges: ['*'],
    priority: 1,
    config: { serverUrl: 'http://localhost:3001' },
  });

  /** Mock fetch: every POST returns a {success,data} envelope wrapping `payload`. */
  const mockFetchReturning = (payload: unknown) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: payload }),
    })) as unknown as typeof fetch);
  };

  test('watchOrderBook(no onData) returns the unwrapped orderbook, not undefined', async () => {
    const orderbook = { bids: [[64203.99, 1.2]], asks: [[64204.1, 0.8]], timestamp: 1, symbol: 'BTC/USDT' };
    mockFetchReturning(orderbook);

    const provider = createCCXTServerProvider(makeProvider());
    const instance = await provider.getWebSocketInstance('binance', 'spot');
    const result = await instance.watchOrderBook('BTC/USDT');

    expect(result).toBeDefined();
    expect(result).toEqual(orderbook);
    expect(result.bids).toHaveLength(1);
  });

  test('watchOHLCV(no onData) returns the unwrapped candles array', async () => {
    const candles = [[1, 100, 110, 95, 105, 12]];
    mockFetchReturning(candles);

    const provider = createCCXTServerProvider(makeProvider());
    const instance = await provider.getWebSocketInstance('binance', 'spot');
    const result = await instance.watchOHLCV('BTC/USDT', '1m');

    expect(result).toEqual(candles);
    expect(Array.isArray(result)).toBe(true);
  });
});
