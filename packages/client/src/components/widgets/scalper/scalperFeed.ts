import type { Trade } from '../../../types/dataProviders';
import { buildFootprintCandles } from '../charts/footprintAggregator';
import type { ClusterCandle, OrderBookSnapshot, PriceLevel, TickCandle } from './scalperModel';

/**
 * Builds the scalper panes' inputs from the terminal's own streams.
 *
 * scalper-iced consumed `{orderbook, clusters, ticks}` off a websocket served by
 * a Go aggregator. There is no such service here, so the same three shapes are
 * derived in the browser from the order book and the trade tape. The functions
 * are pure and live outside the widget so the aggregation can be tested without
 * a live feed.
 */

type RawEntry = { price: number; amount: number } | [number, number];

function toLevel(entry: RawEntry): PriceLevel | null {
  if (Array.isArray(entry)) {
    const [price, amount] = entry;
    return typeof price === 'number' && typeof amount === 'number' ? { price, amount } : null;
  }
  if (!entry || typeof entry.price !== 'number' || typeof entry.amount !== 'number') return null;
  return { price: entry.price, amount: entry.amount };
}

/**
 * Normalize whatever the provider hands back into a snapshot: levels sorted
 * away from the spread, spread computed, depth capped per side.
 */
export function toOrderBookSnapshot(
  book: { bids?: RawEntry[]; asks?: RawEntry[]; timestamp?: number } | null | undefined,
  depthPerSide: number,
): OrderBookSnapshot | null {
  if (!book?.bids?.length || !book?.asks?.length) return null;

  const bids = book.bids.map(toLevel).filter(Boolean).slice(0, depthPerSide) as PriceLevel[];
  const asks = book.asks.map(toLevel).filter(Boolean).slice(0, depthPerSide) as PriceLevel[];
  if (!bids.length || !asks.length) return null;

  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  const spread = asks[0].price - bids[0].price;
  const mid = (asks[0].price + bids[0].price) / 2;
  return {
    bids,
    asks,
    spread,
    spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
    timestamp: book.timestamp ?? Date.now(),
  };
}

/**
 * Tick candles: a fixed *number of prints* per candle, not a fixed duration.
 * That is what makes a tick chart useful for scalping — quiet minutes collapse
 * and bursts expand, so each candle carries the same amount of activity.
 */
export function buildTickCandles(trades: Trade[], ticksPerCandle: number, maxCandles: number): TickCandle[] {
  if (!trades.length || !(ticksPerCandle > 0) || !(maxCandles > 0)) return [];

  const ordered = [...trades]
    .filter(t => typeof t.price === 'number' && typeof t.timestamp === 'number')
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!ordered.length) return [];

  // Only the newest whole candles are worth building; anything older would be
  // dropped by maxCandles anyway.
  const keep = maxCandles * ticksPerCandle;
  const window = ordered.length > keep ? ordered.slice(ordered.length - keep) : ordered;

  const candles: TickCandle[] = [];
  for (let i = 0; i < window.length; i += ticksPerCandle) {
    const chunk = window.slice(i, i + ticksPerCandle);
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    for (const t of chunk) {
      if (t.price > high) high = t.price;
      if (t.price < low) low = t.price;
      const amount = t.amount ?? 0;
      volume += amount;
      if (t.side === 'sell') sellVolume += amount;
      else buyVolume += amount;
    }
    candles.push({
      timestamp: chunk[chunk.length - 1].timestamp,
      open: chunk[0].price,
      close: chunk[chunk.length - 1].price,
      high,
      low,
      volume,
      count: chunk.length,
      buyVolume,
      sellVolume,
    });
  }
  return candles;
}

/**
 * Cluster candles — the same time × price fold as the footprint chart, restated
 * as volume plus a buy share. Reusing that aggregator keeps one implementation
 * of the aggressor rule (a buy lifts the ask) instead of two that can drift.
 */
export function buildClusterCandles(
  trades: Trade[],
  timeframeMs: number,
  priceStep: number,
  maxCandles: number,
): ClusterCandle[] {
  return buildFootprintCandles(trades, timeframeMs, priceStep, maxCandles).map(candle => ({
    timestamp: candle.time,
    clusterPoints: candle.levels
      .map(level => {
        const volume = level.bidVolume + level.askVolume;
        return {
          price: level.price,
          volume,
          // askVolume is what buyers lifted, so it is the buy share.
          percent: volume > 0 ? (level.askVolume / volume) * 100 : 50,
        };
      })
      .filter(point => point.volume > 0)
      .sort((a, b) => b.price - a.price),
  }));
}

/**
 * Tick size guessed from the prices actually seen. The exchange's real tick
 * lives in market metadata the widget does not load; the smallest non-zero gap
 * between distinct traded/quoted prices is a good enough floor for grouping.
 */
export function inferTickSize(prices: number[], fallback: number): number {
  const distinct = Array.from(new Set(prices.filter(p => Number.isFinite(p)))).sort((a, b) => a - b);
  let min = Infinity;
  for (let i = 1; i < distinct.length; i++) {
    const gap = distinct[i] - distinct[i - 1];
    if (gap > 0 && gap < min) min = gap;
  }
  if (!Number.isFinite(min) || min <= 0) return fallback;
  // Snap to a power of ten so grouping multiples stay readable (0.01, not 0.013).
  // The epsilon matters: 100.01 - 100 is 0.00999…, whose log10 floors to -3 and
  // would hand back a tick ten times finer than the instrument's.
  const exp = Math.floor(Math.log10(min) + 1e-9);
  return Math.pow(10, exp);
}
