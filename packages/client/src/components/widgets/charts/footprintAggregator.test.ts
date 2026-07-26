import { describe, it, expect } from 'vitest';
import { autoPriceStep, buildFootprintCandles, niceStep } from './footprintAggregator';
import type { Trade } from '../../../types/dataProviders';

function trade(timestamp: number, price: number, amount: number, side: 'buy' | 'sell'): Trade {
  return { id: `${timestamp}-${price}-${side}`, timestamp, price, amount, side } as Trade;
}

describe('niceStep', () => {
  it('snaps to 1/2/5 × 10^n', () => {
    expect(niceStep(0.9)).toBe(1);
    expect(niceStep(1.4)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(0.026)).toBeCloseTo(0.05, 10);
  });

  it('refuses to return a zero or negative step', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
  });
});

describe('autoPriceStep', () => {
  it('scales with the traded range, not the absolute price', () => {
    const cheap = [trade(1, 0.5, 1, 'buy'), trade(2, 0.86, 1, 'buy')];
    const rich = [trade(1, 50_000, 1, 'buy'), trade(2, 86_000, 1, 'buy')];
    expect(autoPriceStep(cheap)).toBeLessThan(1);
    expect(autoPriceStep(rich)).toBeGreaterThan(100);
  });

  it('falls back to a fraction of price when every trade printed at one level', () => {
    expect(autoPriceStep([trade(1, 100, 1, 'buy'), trade(2, 100, 2, 'sell')])).toBeGreaterThan(0);
  });

  it('returns 0 for an empty tape', () => {
    expect(autoPriceStep([])).toBe(0);
  });
});

describe('buildFootprintCandles', () => {
  const tf = 60_000;

  it('splits volume by aggressor: buys are ask volume, sells are bid volume', () => {
    const candles = buildFootprintCandles(
      [trade(0, 100, 3, 'buy'), trade(1_000, 100, 2, 'sell')],
      tf,
      1,
      10,
    );
    expect(candles).toHaveLength(1);
    expect(candles[0].levels).toHaveLength(1);
    expect(candles[0].levels[0]).toMatchObject({ price: 100, askVolume: 3, bidVolume: 2 });
  });

  it('buckets by time and by price', () => {
    const candles = buildFootprintCandles(
      [
        trade(0, 100, 1, 'buy'),
        trade(10, 100.4, 1, 'buy'), // same price bucket at step 1
        trade(20, 102, 1, 'sell'),
        trade(tf + 5, 100, 1, 'buy'), // next candle
      ],
      tf,
      1,
      10,
    );
    expect(candles).toHaveLength(2);
    expect(candles[0].levels.map((l) => l.price)).toEqual([100, 102]);
    expect(candles[0].levels[0].askVolume).toBe(2);
    expect(candles[1].levels).toHaveLength(1);
  });

  it('derives OHLC from the trades in the bucket, in time order', () => {
    const candles = buildFootprintCandles(
      [trade(30, 101, 1, 'buy'), trade(10, 100, 1, 'buy'), trade(20, 105, 1, 'sell')],
      tf,
      1,
      10,
    );
    // Input is deliberately out of order — the aggregator sorts before folding.
    expect(candles[0]).toMatchObject({ open: 100, close: 101, high: 105, low: 100 });
  });

  it('keeps only the newest maxCandles buckets', () => {
    const trades = Array.from({ length: 5 }, (_, i) => trade(i * tf, 100 + i, 1, 'buy'));
    const candles = buildFootprintCandles(trades, tf, 1, 2);
    expect(candles).toHaveLength(2);
    expect(candles[0].time).toBe(3 * tf);
    expect(candles[1].time).toBe(4 * tf);
  });

  it('returns nothing without a usable step or tape', () => {
    expect(buildFootprintCandles([], tf, 1, 10)).toEqual([]);
    expect(buildFootprintCandles([trade(0, 100, 1, 'buy')], tf, 0, 10)).toEqual([]);
  });
});
