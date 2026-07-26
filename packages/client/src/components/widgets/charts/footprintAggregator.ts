import type { Trade } from '../../../types/dataProviders';
import type { FootprintCandle, FootprintPriceLevel } from './Footprint';

/**
 * Trade-tape → footprint candles.
 *
 * A footprint buckets trades twice: by time into candles, and by price into
 * levels, with the aggressor side deciding the column — a buy lifts the ask, so
 * it counts as ask volume. Kept out of the widget so the arithmetic is testable
 * without a live tape.
 */

/** Round to a 1/2/5 × 10^n step so price ladders land on readable numbers. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const norm = raw / base;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return factor * base;
}

/** Price step that gives roughly `targetRows` rows across the traded range. */
export function autoPriceStep(trades: Trade[], targetRows = 36): number {
  if (!trades.length) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const t of trades) {
    if (typeof t.price !== 'number') continue;
    min = Math.min(min, t.price);
    max = Math.max(max, t.price);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  const range = max - min;
  if (range <= 0) return niceStep(Math.max(max, 1) * 0.0005);
  return niceStep(range / targetRows);
}

export function buildFootprintCandles(
  trades: Trade[],
  timeframeMs: number,
  priceStep: number,
  maxCandles: number,
): FootprintCandle[] {
  if (!trades.length || !(priceStep > 0) || !(timeframeMs > 0)) return [];

  const buckets = new Map<
    number,
    { levels: Map<number, FootprintPriceLevel>; open: number; close: number; high: number; low: number }
  >();

  const ordered = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  for (const trade of ordered) {
    if (typeof trade.price !== 'number' || typeof trade.amount !== 'number') continue;
    const bucketTime = Math.floor(trade.timestamp / timeframeMs) * timeframeMs;
    const priceBucket = Math.round(trade.price / priceStep) * priceStep;

    let bucket = buckets.get(bucketTime);
    if (!bucket) {
      bucket = { levels: new Map(), open: trade.price, close: trade.price, high: trade.price, low: trade.price };
      buckets.set(bucketTime, bucket);
    }
    bucket.close = trade.price;
    bucket.high = Math.max(bucket.high, trade.price);
    bucket.low = Math.min(bucket.low, trade.price);

    let level = bucket.levels.get(priceBucket);
    if (!level) {
      level = { price: priceBucket, bidVolume: 0, askVolume: 0 };
      bucket.levels.set(priceBucket, level);
    }
    if (trade.side === 'sell') level.bidVolume += trade.amount;
    else level.askVolume += trade.amount;
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-maxCandles)
    .map(([time, bucket]) => ({
      time,
      open: bucket.open,
      close: bucket.close,
      high: bucket.high,
      low: bucket.low,
      levels: Array.from(bucket.levels.values()).sort((a, b) => a.price - b.price),
    }));
}
