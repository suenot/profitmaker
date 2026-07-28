import { describe, it, expect } from 'vitest';
import { startOfToday, summarizePnl, unrealizedOf, type MyTrade } from './scalperPnl';

function fill(timestamp: number, side: 'buy' | 'sell', price: number, amount: number, extra: Partial<MyTrade> = {}): MyTrade {
  return { timestamp, side, price, amount, symbol: 'BTC/USDT', ...extra };
}

describe('summarizePnl', () => {
  it('realizes on the closing fill, not the opening one', () => {
    const summary = summarizePnl([fill(1, 'buy', 100, 1), fill(2, 'sell', 110, 1)]);
    expect(summary.realized).toBeCloseTo(10, 10);
    expect(summary.trades).toBe(2);
    expect(summary.closedTrades).toBe(1);
    expect(summary.winRate).toBe(100);
  });

  it('averages the entry when adding to a position', () => {
    const summary = summarizePnl([
      fill(1, 'buy', 100, 1),
      fill(2, 'buy', 120, 1), // average entry 110
      fill(3, 'sell', 115, 2),
    ]);
    expect(summary.realized).toBeCloseTo(10, 10);
  });

  it('handles shorts', () => {
    const summary = summarizePnl([fill(1, 'sell', 100, 2), fill(2, 'buy', 90, 2)]);
    expect(summary.realized).toBeCloseTo(20, 10);
    expect(summary.winRate).toBe(100);
  });

  it('realizes only the closing part of a flip and re-enters at the fill price', () => {
    const summary = summarizePnl([
      fill(1, 'buy', 100, 1),
      fill(2, 'sell', 110, 3), // closes 1 (+10), opens a 2-lot short at 110
      fill(3, 'buy', 100, 2), // covers the short (+20)
    ]);
    expect(summary.realized).toBeCloseTo(30, 10);
    expect(summary.closedTrades).toBe(2);
  });

  it('keeps symbols apart', () => {
    const summary = summarizePnl([
      fill(1, 'buy', 100, 1, { symbol: 'BTC/USDT' }),
      fill(2, 'buy', 10, 1, { symbol: 'ETH/USDT' }),
      fill(3, 'sell', 110, 1, { symbol: 'BTC/USDT' }),
    ]);
    // The ETH buy must not net against the BTC position.
    expect(summary.realized).toBeCloseTo(10, 10);
    expect(summary.closedTrades).toBe(1);
  });

  it('counts a losing close against the win rate', () => {
    const summary = summarizePnl([
      fill(1, 'buy', 100, 1),
      fill(2, 'sell', 90, 1),
      fill(3, 'buy', 100, 1),
      fill(4, 'sell', 110, 1),
    ]);
    expect(summary.realized).toBeCloseTo(0, 10);
    expect(summary.closedTrades).toBe(2);
    expect(summary.winRate).toBe(50);
  });

  it('sums fees from either shape the venues use', () => {
    const summary = summarizePnl([
      fill(1, 'buy', 100, 1, { fee: { cost: 0.1, currency: 'USDT' } }),
      fill(2, 'sell', 110, 1, { fees: [{ cost: 0.2 }, { cost: 0.05 }] }),
    ]);
    expect(summary.fees).toBeCloseTo(0.35, 10);
  });

  it('sorts fills before folding and honours the window', () => {
    const trades = [fill(20, 'sell', 110, 1), fill(10, 'buy', 100, 1)];
    expect(summarizePnl(trades).realized).toBeCloseTo(10, 10);
    // Only the sell is in the window, so it opens a short and realizes nothing.
    expect(summarizePnl(trades, 15).realized).toBe(0);
    expect(summarizePnl(trades, 15).trades).toBe(1);
  });

  it('is all zeros without fills', () => {
    expect(summarizePnl([])).toEqual({ realized: 0, fees: 0, trades: 0, closedTrades: 0, winRate: 0 });
  });
});

describe('startOfToday', () => {
  it('is local midnight of the given instant', () => {
    const noon = new Date(2026, 6, 28, 12, 34, 56).getTime();
    const midnight = new Date(2026, 6, 28, 0, 0, 0, 0).getTime();
    expect(startOfToday(noon)).toBe(midnight);
  });
});

describe('unrealizedOf', () => {
  it('prefers what the exchange reports', () => {
    expect(unrealizedOf({ unrealizedPnl: -4.5 })).toBe(-4.5);
    expect(unrealizedOf({ unrealisedPnl: 3 })).toBe(3);
  });

  it('derives it from mark and entry when it is missing', () => {
    expect(unrealizedOf({ contracts: 2, entryPrice: 100, markPrice: 105, side: 'long' })).toBeCloseTo(10, 10);
    expect(unrealizedOf({ contracts: 2, entryPrice: 100, markPrice: 105, side: 'short' })).toBeCloseTo(-10, 10);
  });

  it('is zero without a position', () => {
    expect(unrealizedOf(null)).toBe(0);
    expect(unrealizedOf({ contracts: 0 })).toBe(0);
  });
});
