import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the ccxt provider's leverage reads.
 *
 * The behaviour under test is the fallback ladder in fetchLeverages: a real
 * batch call when the exchange has one, per-symbol reads (concurrent, bounded)
 * when it only answers one pair at a time — bybit's case — and open positions
 * as the last resort. The bybit shape is the one that used to come back empty,
 * so it gets the explicit test.
 */

const ccxtInstance = { current: null as any };
vi.mock('../services/ccxtCache', () => ({
  getCCXTInstance: async () => ccxtInstance.current,
}));

const { ccxtProviderFactory } = await import('./ccxtProvider');

async function makeProvider() {
  const instance = await ccxtProviderFactory.create({ exchange: 'test' } as any);
  return instance.trading!;
}

beforeEach(() => {
  ccxtInstance.current = null;
});

describe('fetchLeverages', () => {
  it('uses the unified batch call when the exchange has one', async () => {
    ccxtInstance.current = {
      id: 'binanceusdm',
      has: { fetchLeverages: true },
      fetchLeverages: async () => ({
        'BTC/USDT:USDT': { symbol: 'BTC/USDT:USDT', longLeverage: 20, shortLeverage: 20, marginMode: 'cross' },
      }),
    };
    const rows = await (await makeProvider()).fetchLeverages(['BTC/USDT:USDT']);
    expect(rows).toEqual([
      expect.objectContaining({ symbol: 'BTC/USDT:USDT', leverage: 20, marginMode: 'cross', source: 'fetchLeverages' }),
    ]);
  });

  it('reads per symbol when the exchange has no batch call (bybit shape)', async () => {
    let inFlight = 0;
    let peak = 0;
    ccxtInstance.current = {
      id: 'bybit',
      has: { fetchLeverage: true, fetchPositions: true },
      fetchLeverage: async (symbol: string) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise(r => setTimeout(r, 1));
        inFlight--;
        return { symbol, longLeverage: 10, shortLeverage: 10, marginMode: 'cross' };
      },
      fetchPositions: async () => [],
    };

    const symbols = Array.from({ length: 12 }, (_, i) => `P${i}/USDT:USDT`);
    const rows = await (await makeProvider()).fetchLeverages(symbols);

    // Every requested pair comes back, in request order...
    expect(rows.map((r: any) => r.symbol)).toEqual(symbols);
    expect(rows.every((r: any) => r.leverage === 10 && r.source === 'fetchLeverage')).toBe(true);
    // ...and the reads overlap instead of running one-at-a-time, but stay bounded.
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('drops the symbols that error and keeps the rest', async () => {
    ccxtInstance.current = {
      id: 'bybit',
      has: { fetchLeverage: true },
      fetchLeverage: async (symbol: string) => {
        if (symbol === 'BAD/USDT:USDT') throw new Error('symbol not supported');
        return { symbol, longLeverage: 5, shortLeverage: 5 };
      },
    };
    const rows = await (await makeProvider()).fetchLeverages(['A/USDT:USDT', 'BAD/USDT:USDT', 'B/USDT:USDT']);
    expect(rows.map((r: any) => r.symbol)).toEqual(['A/USDT:USDT', 'B/USDT:USDT']);
  });

  it('falls back to open positions when asked without symbols', async () => {
    ccxtInstance.current = {
      id: 'bybit',
      has: { fetchLeverage: true, fetchPositions: true },
      fetchLeverage: async () => { throw new Error('should not be called without symbols'); },
      fetchPositions: async () => [
        { symbol: 'BTC/USDT:USDT', leverage: 25, marginMode: 'isolated' },
        { symbol: 'NOLEV/USDT:USDT' },
      ],
    };
    const rows = await (await makeProvider()).fetchLeverages();
    expect(rows).toEqual([
      { symbol: 'BTC/USDT:USDT', leverage: 25, marginMode: 'isolated', source: 'position' },
    ]);
  });
});
