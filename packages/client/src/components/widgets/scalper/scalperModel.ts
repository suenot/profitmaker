/**
 * Data the scalper panes draw, and the bucketing that adapts it to the current
 * grouping.
 *
 * Ported from scalper-iced (`src/model/*.rs`, Unlicense). There the shapes came
 * off a websocket from a Go aggregator; here they are built in the browser from
 * the streams the terminal already has (see scalperFeed.ts), so the types are
 * the contract between the feed and the panes rather than a wire format.
 */

export interface PriceLevel {
  price: number;
  amount: number;
}

export interface OrderBookSnapshot {
  /** Ascending from the best ask. */
  asks: PriceLevel[];
  /** Descending from the best bid. */
  bids: PriceLevel[];
  spread: number;
  spreadPercent: number;
  timestamp: number;
}

/** One traded price inside a cluster candle. `percent` is the buy share, 0..100. */
export interface ClusterPoint {
  price: number;
  volume: number;
  percent: number;
}

export interface ClusterCandle {
  timestamp: number;
  clusterPoints: ClusterPoint[];
}

export interface TickCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  count: number;
  buyVolume: number;
  sellVolume: number;
}

export function midPrice(book: OrderBookSnapshot): number {
  const bid = book.bids[0]?.price;
  const ask = book.asks[0]?.price;
  return bid !== undefined && ask !== undefined ? (bid + ask) / 2 : book.spread;
}

export function bookMaxVolume(book: OrderBookSnapshot): number {
  let max = 0;
  for (const l of book.bids) if (l.amount > max) max = l.amount;
  for (const l of book.asks) if (l.amount > max) max = l.amount;
  return max;
}

export function isBullish(candle: TickCandle): boolean {
  return candle.close >= candle.open;
}

export function tickDelta(candle: TickCandle): number {
  return candle.buyVolume - candle.sellVolume;
}

/**
 * Bucket key for a price at a given grouping. Floor, not round, so a level
 * belongs to the bucket that contains it and bucket edges are stable as the
 * price moves — rounding would make a level hop between buckets.
 */
function bucketKey(price: number, step: number): number {
  return Math.floor(price / step);
}

/** Sum levels into buckets of `step`, keeping each side's own ordering. */
export function aggregateLevels(levels: PriceLevel[], step: number, isAsk: boolean): PriceLevel[] {
  if (!(step > 0)) return levels;
  const buckets = new Map<number, number>();
  for (const level of levels) {
    const key = bucketKey(level.price, step);
    buckets.set(key, (buckets.get(key) ?? 0) + level.amount);
  }
  const out = Array.from(buckets, ([key, amount]) => ({ price: key * step, amount }));
  out.sort((a, b) => (isAsk ? a.price - b.price : b.price - a.price));
  return out;
}

/** The whole book at a coarser grouping, spread recomputed from the result. */
export function aggregateBook(book: OrderBookSnapshot, step: number): OrderBookSnapshot {
  const asks = aggregateLevels(book.asks, step, true);
  const bids = aggregateLevels(book.bids, step, false);
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  let spread = book.spread;
  let spreadPercent = book.spreadPercent;
  if (bestBid !== undefined && bestAsk !== undefined) {
    spread = bestAsk - bestBid;
    const mid = (bestAsk + bestBid) / 2;
    spreadPercent = mid > 0 ? (spread / mid) * 100 : 0;
  }
  return { asks, bids, spread, spreadPercent, timestamp: book.timestamp };
}

/**
 * Cluster candle at a coarser grouping: volumes add up, and `percent` is
 * re-averaged by volume so a big buy-heavy print is not diluted by a tiny
 * sell-heavy one in the same bucket.
 */
export function aggregateCluster(candle: ClusterCandle, step: number): ClusterCandle {
  if (!(step > 0)) return candle;
  const buckets = new Map<number, { volume: number; weighted: number }>();
  for (const point of candle.clusterPoints) {
    const key = bucketKey(point.price, step);
    const entry = buckets.get(key);
    if (entry) {
      entry.volume += point.volume;
      entry.weighted += point.volume * point.percent;
    } else {
      buckets.set(key, { volume: point.volume, weighted: point.volume * point.percent });
    }
  }
  const clusterPoints = Array.from(buckets, ([key, { volume, weighted }]) => ({
    price: key * step,
    volume,
    percent: volume > 0 ? weighted / volume : 50,
  })).sort((a, b) => b.price - a.price);
  return { timestamp: candle.timestamp, clusterPoints };
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(1);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export function formatVolume(vol: number): string {
  const abs = Math.abs(vol);
  if (abs >= 1000) return vol.toFixed(0);
  if (abs >= 100) return vol.toFixed(1);
  if (abs >= 1) return vol.toFixed(2);
  if (abs >= 0.01) return vol.toFixed(3);
  if (abs >= 0.001) return vol.toFixed(4);
  return vol.toFixed(5);
}

export function formatSignedVolume(vol: number): string {
  return `${vol >= 0 ? '+' : ''}${formatVolume(vol)}`;
}

export function formatClock(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
