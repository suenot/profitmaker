import { describe, expect, it, vi } from 'vitest';
import {
  createListedSpotMarketLoader,
  getDirectUsdValue,
  resolveListedUsdPrice,
} from './userBalancePricing';

describe('user balance USD pricing', () => {
  it('treats an unlisted asset as a quiet miss without probing ticker endpoints', async () => {
    const getSymbolsForExchange = vi.fn().mockResolvedValue([
      'BTC/USDT',
      'ETH/USDC',
    ]);
    const getTickerWithRefresh = vi.fn();
    const getListedSpotMarkets = createListedSpotMarketLoader(getSymbolsForExchange);

    const result = await resolveListedUsdPrice({
      currency: 'PORT3',
      amount: 0.078,
      exchange: 'bybit',
      getListedSpotMarkets,
      getTickerWithRefresh,
    });

    expect(result).toEqual({});
    expect(getTickerWithRefresh).not.toHaveBeenCalled();
  });

  it('uses a listed USDT market and preserves the cached ticker call contract', async () => {
    const getListedSpotMarkets = vi.fn().mockResolvedValue(new Set(['BTC/USDT']));
    const getTickerWithRefresh = vi.fn().mockResolvedValue({ bid: 64_000 });

    const result = await resolveListedUsdPrice({
      currency: 'BTC',
      amount: 0.25,
      exchange: 'bybit',
      getListedSpotMarkets,
      getTickerWithRefresh,
    });

    expect(result).toEqual({ value: 16_000, rate: '64000.000000 USDT' });
    expect(getTickerWithRefresh).toHaveBeenCalledOnce();
    expect(getTickerWithRefresh).toHaveBeenCalledWith('bybit', 'BTC/USDT', 'spot', false);
  });

  it('falls back only through listed quote markets when a ticker has no usable bid', async () => {
    const getListedSpotMarkets = vi.fn().mockResolvedValue(new Set([
      'ETH/USDT',
      'ETH/USDC',
    ]));
    const getTickerWithRefresh = vi.fn()
      .mockResolvedValueOnce({ bid: 0 })
      .mockResolvedValueOnce({ bid: 3_200 });

    const result = await resolveListedUsdPrice({
      currency: 'ETH',
      amount: 2,
      exchange: 'bybit',
      getListedSpotMarkets,
      getTickerWithRefresh,
    });

    expect(result).toEqual({ value: 6_400, rate: '3200.000000 USDC' });
    expect(getTickerWithRefresh.mock.calls.map((call) => call[1])).toEqual([
      'ETH/USDT',
      'ETH/USDC',
    ]);
  });

  it('reuses a successful spot catalog for valid assets on the same exchange', async () => {
    const getSymbolsForExchange = vi.fn().mockResolvedValue([
      'BTC/USDT',
      'ETH/USDT',
    ]);
    const getListedSpotMarkets = createListedSpotMarketLoader(getSymbolsForExchange);

    const [first, second] = await Promise.all([
      getListedSpotMarkets('bybit'),
      getListedSpotMarkets('bybit'),
    ]);

    expect(first.has('BTC/USDT')).toBe(true);
    expect(second.has('ETH/USDT')).toBe(true);
    expect(getSymbolsForExchange).toHaveBeenCalledOnce();
    expect(getSymbolsForExchange).toHaveBeenCalledWith('bybit', undefined, 'spot');
  });

  it('keeps direct USD-equivalent assets at one-to-one without market lookup', () => {
    expect(getDirectUsdValue('USDT', 99.5)).toEqual({ value: 99.5, rate: '1:1' });
    expect(getDirectUsdValue('BTC', 1)).toBeUndefined();
  });
});
