import { describe, it, expect } from 'vitest';
import {
  aggregateBook,
  aggregateCluster,
  aggregateLevels,
  bookMaxVolume,
  formatSignedVolume,
  isBullish,
  midPrice,
  tickDelta,
  type ClusterCandle,
  type OrderBookSnapshot,
  type TickCandle,
} from './scalperModel';

const book: OrderBookSnapshot = {
  asks: [
    { price: 100.1, amount: 2 },
    { price: 100.2, amount: 3 },
    { price: 100.6, amount: 1 },
  ],
  bids: [
    { price: 100.0, amount: 5 },
    { price: 99.9, amount: 1 },
    { price: 99.4, amount: 4 },
  ],
  spread: 0.1,
  spreadPercent: 0.0999,
  timestamp: 1_000,
};

describe('order book', () => {
  it('takes the mid from the best bid and ask', () => {
    expect(midPrice(book)).toBeCloseTo(100.05, 10);
  });

  it('falls back to the spread field when a side is empty', () => {
    expect(midPrice({ ...book, bids: [] })).toBe(0.1);
  });

  it('finds the deepest level across both sides', () => {
    expect(bookMaxVolume(book)).toBe(5);
  });
});

describe('aggregateLevels', () => {
  it('sums into buckets and keeps each side ordered away from the spread', () => {
    expect(aggregateLevels(book.asks, 0.5, true)).toEqual([
      { price: 100, amount: 5 },
      { price: 100.5, amount: 1 },
    ]);
    // 99.9 floors into the 99.5 bucket, not the 100 one.
    expect(aggregateLevels(book.bids, 0.5, false)).toEqual([
      { price: 100, amount: 5 },
      { price: 99.5, amount: 1 },
      { price: 99, amount: 4 },
    ]);
  });

  it('is a no-op without a usable step', () => {
    expect(aggregateLevels(book.asks, 0, true)).toBe(book.asks);
  });
});

describe('aggregateBook', () => {
  it('recomputes the spread from the bucketed best bid and ask', () => {
    const agg = aggregateBook(book, 0.5);
    // Both best levels land in the 100.0 bucket, so the visible spread closes.
    expect(agg.bids[0].price).toBe(100);
    expect(agg.asks[0].price).toBe(100);
    expect(agg.spread).toBe(0);
    expect(agg.spreadPercent).toBe(0);
  });
});

describe('aggregateCluster', () => {
  const candle: ClusterCandle = {
    timestamp: 5,
    clusterPoints: [
      { price: 100.1, volume: 9, percent: 100 },
      { price: 100.4, volume: 1, percent: 0 },
      { price: 101.0, volume: 2, percent: 50 },
    ],
  };

  it('sums volume and averages percent by volume, not by point', () => {
    const agg = aggregateCluster(candle, 1);
    expect(agg.clusterPoints).toEqual([
      { price: 101, volume: 2, percent: 50 },
      { price: 100, volume: 10, percent: 90 },
    ]);
  });

  it('defaults an empty bucket to neutral', () => {
    const agg = aggregateCluster({ timestamp: 1, clusterPoints: [{ price: 10, volume: 0, percent: 100 }] }, 1);
    expect(agg.clusterPoints[0].percent).toBe(50);
  });
});

describe('tick candles', () => {
  const tick: TickCandle = {
    timestamp: 1, open: 10, high: 12, low: 9, close: 11,
    volume: 5, count: 3, buyVolume: 4, sellVolume: 1,
  };

  it('reads direction from open vs close and delta from the two volumes', () => {
    expect(isBullish(tick)).toBe(true);
    expect(isBullish({ ...tick, close: 9 })).toBe(false);
    expect(tickDelta(tick)).toBe(3);
  });

  it('signs the delta for display', () => {
    expect(formatSignedVolume(3)).toBe('+3.00');
    expect(formatSignedVolume(-3)).toBe('-3.00');
  });
});
