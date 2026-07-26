import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Layers } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useGroupStore } from '../../store/groupStore';
import type { MarketType, OrderBookEntry } from '../../types/dataProviders';
import { Heatmap, type HeatmapSlice, type HeatmapTrade } from './charts/Heatmap';

/**
 * Heatmap (historical DOM) — the live order book sampled on an interval and
 * drawn as a time series, with trades on top.
 *
 * The exchange gives us a *current* book only, so history is ours to keep: every
 * SAMPLE_MS a slice of the top levels is pushed into a ring buffer. That makes
 * the widget's memory bounded and its horizon a function of two knobs the user
 * controls (interval × slice count) rather than of how long it stayed open.
 */

// Sampling knobs. 500ms × 240 slices ≈ 2 minutes of history at ~4 columns/sec,
// which reads well at typical widget widths without starving the CPU.
const SAMPLE_OPTIONS = [250, 500, 1000, 2000];
const MAX_SLICES = 240;
/** Levels kept per side in a slice — deeper is noise at heatmap resolution. */
const DEPTH_PER_SIDE = 40;

type Entry = OrderBookEntry | [number, number];

function toLevel(entry: Entry): { price: number; amount: number } | null {
  if (Array.isArray(entry)) {
    const [price, amount] = entry;
    return typeof price === 'number' && typeof amount === 'number' ? { price, amount } : null;
  }
  if (!entry || typeof entry.price !== 'number' || typeof entry.amount !== 'number') return null;
  return { price: entry.price, amount: entry.amount };
}

const HeatmapWidget: React.FC<{ widgetId: string; selectedGroupId?: string }> = ({
  widgetId,
  selectedGroupId,
}) => {
  const { subscribe, unsubscribe, getOrderBook, getTrades, initializeOrderBookData, initializeTradesData } =
    useDataProviderStore();
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();

  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const group = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();
  const exchange = group?.exchange || 'binance';
  const symbol = group?.tradingPair || 'BTC/USDT';
  const market = (group?.market as MarketType) || 'spot';

  const [sampleMs, setSampleMs] = useState(500);
  const [colorScale, setColorScale] = useState<'side' | 'heat' | 'mono'>('side');
  const [showTrades, setShowTrades] = useState(true);
  const [slices, setSlices] = useState<HeatmapSlice[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The instrument the buffer belongs to. Switching symbol must throw the
  // history away — mixing two instruments' prices in one heatmap is nonsense.
  const bufferKey = `${exchange}:${market}:${symbol}`;
  const bufferKeyRef = useRef(bufferKey);

  useEffect(() => {
    bufferKeyRef.current = bufferKey;
    setSlices([]);
  }, [bufferKey]);

  // Subscribe to both streams: depth for the slices, trades for the overlay.
  useEffect(() => {
    const subscriberId = `heatmap-${widgetId}`;
    let cancelled = false;

    const start = async () => {
      try {
        await initializeOrderBookData(exchange, symbol, market);
        await initializeTradesData(exchange, symbol, market);
        if (cancelled) return;
        await subscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
        await subscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void start();

    return () => {
      cancelled = true;
      unsubscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
      unsubscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
    };
  }, [exchange, symbol, market, widgetId, subscribe, unsubscribe, initializeOrderBookData, initializeTradesData]);

  // Sample the book on a timer rather than on every book update: updates arrive
  // at wildly different rates per exchange, and a fixed cadence is what makes
  // the x axis mean "time" instead of "however many messages arrived".
  const sample = useCallback(() => {
    const book = getOrderBook(exchange, symbol, market as any);
    if (!book?.bids || !book?.asks) return;

    const bids = (book.bids as Entry[]).slice(0, DEPTH_PER_SIDE).map(toLevel).filter(Boolean) as {
      price: number;
      amount: number;
    }[];
    const asks = (book.asks as Entry[]).slice(0, DEPTH_PER_SIDE).map(toLevel).filter(Boolean) as {
      price: number;
      amount: number;
    }[];
    if (!bids.length || !asks.length) return;

    const mid = (bids[0].price + asks[0].price) / 2;
    const slice: HeatmapSlice = {
      time: book.timestamp || Date.now(),
      mid,
      levels: [
        ...bids.map((l) => ({ price: l.price, size: l.amount, side: 'bid' as const })),
        ...asks.map((l) => ({ price: l.price, size: l.amount, side: 'ask' as const })),
      ],
    };

    setSlices((prev) => {
      const next = prev.length >= MAX_SLICES ? prev.slice(prev.length - MAX_SLICES + 1) : prev.slice();
      next.push(slice);
      return next;
    });
  }, [exchange, symbol, market, getOrderBook]);

  useEffect(() => {
    const id = window.setInterval(sample, sampleMs);
    return () => window.clearInterval(id);
  }, [sample, sampleMs]);

  // Only trades inside the drawn time span; anything older has scrolled off.
  const trades: HeatmapTrade[] = useMemo(() => {
    if (!showTrades || !slices.length) return [];
    const from = slices[0].time;
    return getTrades(exchange, symbol, market)
      .filter((t: any) => t.timestamp >= from && typeof t.price === 'number')
      .map((t: any) => ({
        time: t.timestamp,
        price: t.price,
        size: t.amount ?? 0,
        side: t.side === 'sell' ? ('sell' as const) : ('buy' as const),
      }));
  }, [showTrades, slices, getTrades, exchange, symbol, market]);

  const priceDecimals = useMemo(() => {
    const last = slices[slices.length - 1];
    const mid = last?.mid ?? 0;
    if (!mid) return 2;
    if (mid >= 1000) return 1;
    if (mid >= 1) return 2;
    return 6;
  }, [slices]);

  const spanSeconds = Math.round((slices.length * sampleMs) / 1000);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
        <span className="text-terminal-text font-medium">{symbol}</span>
        <span className="text-terminal-muted">{exchange} · {market}</span>
        <div className="flex-1" />

        <span className="text-terminal-muted">every</span>
        <select
          value={sampleMs}
          onChange={(e) => setSampleMs(Number(e.target.value))}
          className="bg-terminal-accent/30 text-terminal-text rounded px-1.5 py-0.5 border border-terminal-border"
        >
          {SAMPLE_OPTIONS.map((ms) => (
            <option key={ms} value={ms}>{ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}</option>
          ))}
        </select>

        <select
          value={colorScale}
          onChange={(e) => setColorScale(e.target.value as 'side' | 'heat' | 'mono')}
          className="bg-terminal-accent/30 text-terminal-text rounded px-1.5 py-0.5 border border-terminal-border"
        >
          <option value="side">side</option>
          <option value="heat">heat</option>
          <option value="mono">mono</option>
        </select>

        <button
          onClick={() => setShowTrades((v) => !v)}
          className={`px-1.5 py-0.5 rounded border border-terminal-border ${
            showTrades ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
          }`}
        >
          trades
        </button>
      </div>

      {error && <div className="mb-2 text-xs text-red-400 truncate" title={error}>{error}</div>}

      <div className="flex-grow min-h-0 rounded overflow-hidden">
        {slices.length < 2 ? (
          <div className="h-full flex flex-col items-center justify-center text-terminal-muted gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Collecting order-book history…</span>
          </div>
        ) : (
          <Heatmap
            slices={slices}
            trades={trades}
            colorScale={colorScale}
            showTrades={showTrades}
            priceDecimals={priceDecimals}
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-1 text-[10px] text-terminal-muted">
        <Layers size={11} />
        <span>{slices.length} slices · {spanSeconds}s of depth history · top {DEPTH_PER_SIDE} levels per side</span>
      </div>
    </div>
  );
};

export default HeatmapWidget;
