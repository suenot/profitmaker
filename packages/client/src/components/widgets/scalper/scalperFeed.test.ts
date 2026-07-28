import { describe, it, expect } from 'vitest';
import { buildClusterCandles, buildTickCandles, inferTickSize, toOrderBookSnapshot } from './scalperFeed';
import type { Trade } from '../../../types/dataProviders';

function trade(timestamp: number, price: number, amount: number, side: 'buy' | 'sell'): Trade {
  return { id: `${timestamp}-${price}-${side}`, timestamp, price, amount, side } as Trade;
}

describe('toOrderBookSnapshot', () => {
  it('sorts both sides away from the spread and computes it', () => {
    const snap = toOrderBookSnapshot(
      { bids: [[99, 1], [100, 2]], asks: [[101, 3], [100.5, 4]], timestamp: 7 },
      10,
    )!;
    expect(snap.bids.map(l => l.price)).toEqual([100, 99]);
    expect(snap.asks.map(l => l.price)).toEqual([100.5, 101]);
    expect(snap.spread).toBeCloseTo(0.5, 10);
    expect(snap.spreadPercent).toBeCloseTo(0.499, 2);
    expect(snap.timestamp).toBe(7);
  });

  it('accepts object levels as well as tuples', () => {
    const snap = toOrderBookSnapshot(
      { bids: [{ price: 10, amount: 1 }], asks: [{ price: 11, amount: 1 }] },
      10,
    )!;
    expect(snap.bids[0]).toEqual({ price: 10, amount: 1 });
  });

  it('caps depth per side', () => {
    const bids = Array.from({ length: 50 }, (_, i) => [100 - i, 1] as [number, number]);
    const asks = Array.from({ length: 50 }, (_, i) => [101 + i, 1] as [number, number]);
    const snap = toOrderBookSnapshot({ bids, asks }, 5)!;
    expect(snap.bids).toHaveLength(5);
    expect(snap.asks).toHaveLength(5);
  });

  it('returns null when a side is missing', () => {
    expect(toOrderBookSnapshot({ bids: [[1, 1]] }, 5)).toBeNull();
    expect(toOrderBookSnapshot(null, 5)).toBeNull();
  });
});

describe('buildTickCandles', () => {
  const trades = [
    trade(1, 10, 1, 'buy'),
    trade(2, 12, 2, 'sell'),
    trade(3, 9, 1, 'buy'),
    trade(4, 11, 1, 'buy'),
    trade(5, 13, 3, 'sell'),
    trade(6, 12, 1, 'buy'),
  ];

  it('groups a fixed number of prints per candle, not a fixed duration', () => {
    const candles = buildTickCandles(trades, 3, 10);
    expect(candles).toHaveLength(2);
    expect(candles[0]).toMatchObject({
      open: 10, close: 9, high: 12, low: 9, count: 3, volume: 4, buyVolume: 2, sellVolume: 2,
    });
    expect(candles[1]).toMatchObject({ open: 11, close: 12, high: 13, low: 11, count: 3 });
  });

  it('stamps a candle with its last print', () => {
    expect(buildTickCandles(trades, 3, 10)[0].timestamp).toBe(3);
  });

  it('keeps only the newest maxCandles', () => {
    const candles = buildTickCandles(trades, 2, 2);
    expect(candles).toHaveLength(2);
    expect(candles[0].open).toBe(9); // the first pair fell off
  });

  it('sorts an out-of-order tape before folding', () => {
    const candles = buildTickCandles([trade(5, 20, 1, 'buy'), trade(1, 10, 1, 'buy')], 2, 5);
    expect(candles[0]).toMatchObject({ open: 10, close: 20 });
  });

  it('guards empty input and nonsense sizes', () => {
    expect(buildTickCandles([], 3, 10)).toEqual([]);
    expect(buildTickCandles(trades, 0, 10)).toEqual([]);
    expect(buildTickCandles(trades, 3, 0)).toEqual([]);
  });
});

describe('buildClusterCandles', () => {
  it('restates footprint levels as volume plus a buy share', () => {
    const candles = buildClusterCandles(
      [trade(0, 100, 3, 'buy'), trade(10, 100, 1, 'sell'), trade(20, 102, 2, 'sell')],
      60_000,
      1,
      10,
    );
    expect(candles).toHaveLength(1);
    expect(candles[0].clusterPoints).toEqual([
      { price: 102, volume: 2, percent: 0 },
      { price: 100, volume: 4, percent: 75 },
    ]);
  });

  it('drops empty price levels', () => {
    const candles = buildClusterCandles([trade(0, 50, 1, 'buy')], 60_000, 1, 5);
    expect(candles[0].clusterPoints.every(p => p.volume > 0)).toBe(true);
  });
});

describe('inferTickSize', () => {
  it('takes the smallest gap, snapped down to a power of ten', () => {
    expect(inferTickSize([100, 100.01, 100.02, 100.05], 1)).toBeCloseTo(0.01, 10);
    expect(inferTickSize([100, 100.5, 101], 1)).toBeCloseTo(0.1, 10);
  });

  it('falls back when there is nothing to measure', () => {
    expect(inferTickSize([], 0.5)).toBe(0.5);
    expect(inferTickSize([100, 100, 100], 0.5)).toBe(0.5);
  });
});
