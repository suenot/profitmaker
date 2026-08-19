import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Loader2, Lock, Unlock, MoveVertical } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useGroupStore } from '../../store/groupStore';
import { useNotificationStore } from '../../store/notificationStore';
import { executeOrder, cancelOrder } from '../../services/orderExecutionService';
import { cancelAndFlatten } from '../../services/emergencyFlattenService';
import {
  subscribePrivateTrading,
  type PrivateTradingSubscription,
} from '../../services/privateTradingStream';
import type { MarketType, OrderBookEntry } from '../../types/dataProviders';

/**
 * DOM ladder — a price ladder with click-to-trade.
 *
 * Modelled on the standalone scalper terminal (scalper-iced, public domain):
 * one row per price step, resting size on each side, your own working orders in
 * the outer columns, and a click on a row placing a limit order there. The
 * ladder is the reason a scalper keeps a terminal open, and the order book we
 * already had — two sorted lists — cannot do it: it has no fixed price grid, so
 * rows jump around as levels appear and vanish.
 *
 * Price grouping is the other half. Exchanges quote at tick size, which is far
 * finer than anyone trades on; rows are therefore bucketed into `priceStep` and
 * sizes summed per bucket (Ctrl+scroll changes the bucket, Shift+scroll the row
 * height).
 */

type Entry = OrderBookEntry | [number, number];
type FollowMode = 'auto' | 'locked' | 'manual';

interface LadderRow {
  price: number;
  bidSize: number;
  askSize: number;
  myBid: number;
  myAsk: number;
  traded: number;
}

const STEP_MULTIPLIERS = [1, 2, 5, 10, 25, 50, 100];
const MIN_ROW_HEIGHT = 14;
const MAX_ROW_HEIGHT = 34;
/** Trades kept for the volume-at-price column, in ms. */
const VOLUME_WINDOW_MS = 120_000;

function toLevel(entry: Entry): { price: number; amount: number } | null {
  if (Array.isArray(entry)) {
    const [price, amount] = entry;
    return typeof price === 'number' && typeof amount === 'number' ? { price, amount } : null;
  }
  if (!entry || typeof entry.price !== 'number' || typeof entry.amount !== 'number') return null;
  return { price: entry.price, amount: entry.amount };
}

/** Round to a 1/2/5 × 10^n step so the ladder lands on readable prices. */
function niceStep(raw: number): number {
  if (!(raw > 0)) return 0.01;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const norm = raw / base;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return factor * base;
}

function fmt(n: number, decimals: number): string {
  if (!n) return '';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(decimals);
}

const DomLadderWidget: React.FC<{ widgetId: string; selectedGroupId?: string }> = ({ widgetId, selectedGroupId }) => {
  const {
    subscribe,
    unsubscribe,
    getOrderBook,
    getTrades,
    initializeOrderBookData,
    initializeTradesData,
    fetchOpenOrders,
    fetchPositions,
    fetchMyTrades,
  } = useDataProviderStore();
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const showError = useNotificationStore((s) => s.showError);
  const showSuccess = useNotificationStore((s) => s.showSuccess);

  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const group = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();
  const exchange = group?.exchange || 'binance';
  const symbol = group?.tradingPair || 'BTC/USDT';
  const market = (group?.market as MarketType) || 'spot';
  const accountId = group?.account || '';

  const [stepMultiplier, setStepMultiplier] = useState(1);
  const [rowHeight, setRowHeight] = useState(20);
  const [followMode, setFollowMode] = useState<FollowMode>('auto');
  const [centerPrice, setCenterPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('0.001');
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [position, setPosition] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const emergencyInFlightRef = useRef(false);
  const privateSubscriptionRef = useRef<PrivateTradingSubscription | null>(null);
  const [viewportHeight, setViewportHeight] = useState(400);

  // Market data subscriptions.
  useEffect(() => {
    const subscriberId = `dom-${widgetId}`;
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

  // create/cancel responses are command acknowledgements only. Canonical state
  // comes from the private stream, seeded and recovered with REST snapshots.
  const refreshPrivate = useCallback(async () => {
    await privateSubscriptionRef.current?.reconcile();
  }, []);

  useEffect(() => {
    if (!accountId) {
      privateSubscriptionRef.current = null;
      setOpenOrders([]);
      setPosition(null);
      return;
    }

    let active = true;
    const subscription = subscribePrivateTrading({
      accountId,
      exchangeId: exchange,
      symbol,
      market,
      fetchOpenOrders: () => fetchOpenOrders(accountId, symbol),
      fetchPositions: () => fetchPositions(accountId, [symbol]),
      fetchMyTrades: (since) => fetchMyTrades(accountId, symbol, since, 500),
      onSnapshot: (snapshot) => {
        if (!active) return;
        setOpenOrders(snapshot.openOrders);
        const match = market === 'spot'
          ? undefined
          : snapshot.positions.find(
              (candidate) => candidate?.symbol === symbol && Math.abs(Number(candidate?.contracts ?? 0)) > 0,
            );
        setPosition(match ?? null);
      },
    });
    privateSubscriptionRef.current = subscription;
    return () => {
      active = false;
      if (privateSubscriptionRef.current === subscription) privateSubscriptionRef.current = null;
      subscription.close();
    };
  }, [accountId, exchange, symbol, market, fetchOpenOrders, fetchPositions, fetchMyTrades]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setViewportHeight(r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const book = getOrderBook(exchange, symbol, market as any);
  const trades = getTrades(exchange, symbol, market);

  const bids = useMemo(
    () => ((book?.bids as Entry[]) || []).map(toLevel).filter(Boolean) as { price: number; amount: number }[],
    [book],
  );
  const asks = useMemo(
    () => ((book?.asks as Entry[]) || []).map(toLevel).filter(Boolean) as { price: number; amount: number }[],
    [book],
  );

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const lastPrice = trades.length ? trades[trades.length - 1].price : midPrice;

  // Base step from the book's own tick, then multiplied by the user's grouping.
  const baseStep = useMemo(() => {
    const prices = [...bids.slice(0, 20).map((l) => l.price), ...asks.slice(0, 20).map((l) => l.price)].sort((a, b) => a - b);
    let min = Infinity;
    for (let i = 1; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1];
      if (d > 0) min = Math.min(min, d);
    }
    return Number.isFinite(min) ? min : niceStep((midPrice || 1) * 0.0001);
  }, [bids, asks, midPrice]);

  const priceStep = baseStep * stepMultiplier;

  // Follow modes: 'auto' keeps the market centered, 'locked' pins the row grid
  // to the price it was locked at (so levels stop sliding under the cursor while
  // clicking), 'manual' is a locked grid the user scrolls.
  useEffect(() => {
    if (followMode === 'auto' && midPrice) setCenterPrice(midPrice);
  }, [followMode, midPrice]);

  useEffect(() => {
    if (centerPrice == null && midPrice) setCenterPrice(midPrice);
  }, [centerPrice, midPrice]);

  const rowCount = Math.max(5, Math.floor(viewportHeight / rowHeight));
  const center = centerPrice ?? midPrice;

  const rows: LadderRow[] = useMemo(() => {
    if (!center || !(priceStep > 0)) return [];

    const bucket = (price: number) => Math.round(price / priceStep) * priceStep;
    const bidByBucket = new Map<number, number>();
    const askByBucket = new Map<number, number>();
    for (const l of bids) bidByBucket.set(bucket(l.price), (bidByBucket.get(bucket(l.price)) || 0) + l.amount);
    for (const l of asks) askByBucket.set(bucket(l.price), (askByBucket.get(bucket(l.price)) || 0) + l.amount);

    const myBidByBucket = new Map<number, number>();
    const myAskByBucket = new Map<number, number>();
    for (const o of openOrders) {
      const price = Number(o?.price);
      const remaining = Number(o?.remaining ?? o?.amount ?? 0);
      if (!Number.isFinite(price) || !remaining) continue;
      const target = o?.side === 'sell' ? myAskByBucket : myBidByBucket;
      target.set(bucket(price), (target.get(bucket(price)) || 0) + remaining);
    }

    const since = Date.now() - VOLUME_WINDOW_MS;
    const tradedByBucket = new Map<number, number>();
    for (const t of trades) {
      if (t.timestamp < since || typeof t.price !== 'number') continue;
      tradedByBucket.set(bucket(t.price), (tradedByBucket.get(bucket(t.price)) || 0) + (t.amount || 0));
    }

    const centerBucket = Math.round(center / priceStep);
    const half = Math.floor(rowCount / 2);
    const out: LadderRow[] = [];
    for (let i = half; i >= -half; i--) {
      const price = (centerBucket + i) * priceStep;
      out.push({
        price,
        bidSize: bidByBucket.get(price) || 0,
        askSize: askByBucket.get(price) || 0,
        myBid: myBidByBucket.get(price) || 0,
        myAsk: myAskByBucket.get(price) || 0,
        traded: tradedByBucket.get(price) || 0,
      });
    }
    return out;
  }, [center, priceStep, rowCount, bids, asks, openOrders, trades]);

  const maxRowSize = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.bidSize, r.askSize), 0) || 1,
    [rows],
  );
  const maxTraded = useMemo(() => rows.reduce((m, r) => Math.max(m, r.traded), 0) || 1, [rows]);

  const priceDecimals = useMemo(() => {
    if (priceStep >= 10) return 0;
    if (priceStep >= 1) return 1;
    return Math.min(8, Math.max(2, Math.ceil(-Math.log10(priceStep || 0.01))));
  }, [priceStep]);

  const amountDecimals = priceStep >= 100 ? 3 : 4;
  const canTrade = !!accountId;

  // --- trading actions -----------------------------------------------------

  const place = useCallback(
    async (side: 'buy' | 'sell', type: 'market' | 'limit', price?: number) => {
      const amount = Number(quantity);
      if (!canTrade) {
        showError('No account selected', 'Pick an account in the group selector to trade from the ladder');
        return;
      }
      if (!(amount > 0)) {
        showError('Invalid quantity', 'Set a positive quantity first');
        return;
      }
      setBusy(true);
      try {
        const res = await executeOrder({
          exchange,
          accountId,
          market,
          symbol,
          side,
          type,
          amount,
          price: type === 'limit' ? price : undefined,
        });
        if (res.success) {
          showSuccess(`${side.toUpperCase()} ${type}`, `${amount} ${symbol}${price ? ` @ ${price.toFixed(priceDecimals)}` : ''}`);
        } else {
          showError(`${side.toUpperCase()} failed`, res.error || 'Order rejected');
        }
        await refreshPrivate();
      } catch (e) {
        showError(`${side.toUpperCase()} failed`, e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [quantity, canTrade, exchange, accountId, market, symbol, priceDecimals, showError, showSuccess, refreshPrivate],
  );

  const cancelAll = useCallback(async () => {
    if (!canTrade || !openOrders.length) return;
    setBusy(true);
    try {
      const results = await Promise.all(
        openOrders.map((o) => cancelOrder(String(o.id), symbol, exchange, accountId, market)),
      );
      const failed = results.filter((r) => !r.success).length;
      if (failed) showError('Cancel all', `${failed} of ${results.length} cancellation requests were rejected`);
      else showSuccess('Cancel requests sent', `${results.length} cancellation request${results.length === 1 ? '' : 's'} accepted`);
      await refreshPrivate();
    } finally {
      setBusy(false);
    }
  }, [canTrade, openOrders, symbol, exchange, accountId, market, showError, showSuccess, refreshPrivate]);

  /** Flatten the position with a reduce-only market order in the opposite side. */
  const closePosition = useCallback(async () => {
    const size = Number(position?.contracts ?? 0);
    if (!canTrade || !size) return;
    const side = Number(position?.side === 'short' ? -1 : 1) > 0 ? 'sell' : 'buy';
    setBusy(true);
    try {
      const res = await executeOrder({
        exchange,
        accountId,
        market,
        symbol,
        side,
        type: 'market',
        amount: Math.abs(size),
        reduceOnly: true,
      });
      if (res.success) showSuccess('Close request sent', `${Math.abs(size)} ${symbol} reduce-only order accepted`);
      else showError('Close failed', res.error || 'Order rejected');
      await refreshPrivate();
    } catch (e) {
      showError('Close failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [position, canTrade, exchange, accountId, market, symbol, showError, showSuccess, refreshPrivate]);

  const emergencyCancelAndFlatten = useCallback(async () => {
    if (!canTrade || emergencyInFlightRef.current) return;
    emergencyInFlightRef.current = true;
    setBusy(true);
    try {
      const result = await cancelAndFlatten({
        exchange,
        accountId,
        market,
        symbol,
        openOrders,
        fetchOpenOrders: () => fetchOpenOrders(accountId, symbol),
        fetchPositions: () => fetchPositions(accountId, [symbol]),
      });

      if (result.success) {
        showSuccess(
          'Emergency flatten complete',
          result.flattenedContracts > 0
            ? `${result.flattenedContracts} ${symbol} closed after reconciliation`
            : 'Open orders cleared; position already flat',
        );
      } else {
        showError('Emergency flatten not confirmed', result.error || 'Final account state is unknown');
      }
      await refreshPrivate();
    } catch (error) {
      showError('Emergency flatten failed', error instanceof Error ? error.message : String(error));
    } finally {
      emergencyInFlightRef.current = false;
      setBusy(false);
    }
  }, [
    canTrade,
    exchange,
    accountId,
    market,
    symbol,
    openOrders,
    fetchOpenOrders,
    fetchPositions,
    showError,
    showSuccess,
    refreshPrivate,
  ]);

  // --- interactions --------------------------------------------------------

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Grouping: step through the multipliers rather than scaling freely, so
        // the ladder always sits on a round step.
        e.preventDefault();
        setStepMultiplier((m) => {
          const i = STEP_MULTIPLIERS.indexOf(m);
          const next = e.deltaY < 0 ? i + 1 : i - 1;
          return STEP_MULTIPLIERS[Math.min(STEP_MULTIPLIERS.length - 1, Math.max(0, next))];
        });
        return;
      }
      if (e.shiftKey) {
        e.preventDefault();
        setRowHeight((h) => Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, h + (e.deltaY < 0 ? 1 : -1))));
        return;
      }
      // Plain scroll pans the grid, which only means anything once the grid has
      // stopped following the market.
      if (followMode === 'auto') setFollowMode('manual');
      setCenterPrice((c) => (c ?? midPrice) + (e.deltaY > 0 ? -priceStep : priceStep) * 3);
    },
    [followMode, midPrice, priceStep],
  );

  // Hotkeys, scoped to a focused ladder so they cannot fire while the user is
  // typing elsewhere in the terminal.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if (key === 't') { e.preventDefault(); void place('buy', 'market'); }
      else if (key === 'y') { e.preventDefault(); void place('sell', 'market'); }
      else if (key === 'd') { e.preventDefault(); void closePosition(); }
      else if (key === 'r') { e.preventDefault(); setFollowMode((m) => (m === 'auto' ? 'locked' : 'auto')); }
      else if (e.key === ' ') { e.preventDefault(); void cancelAll(); }
      else if (e.key === 'Escape') { e.preventDefault(); void emergencyCancelAndFlatten(); }
      else if (e.key === 'Shift') { setCenterPrice(midPrice); setFollowMode('auto'); }
    },
    [place, closePosition, cancelAll, emergencyCancelAndFlatten, midPrice],
  );

  const positionSize = Number(position?.contracts ?? 0);
  const positionSide = position?.side as string | undefined;
  const unrealized = Number(position?.unrealizedPnl ?? 0);

  return (
    <div
      className="h-full flex flex-col text-xs outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-terminal-text font-medium">{symbol}</span>
        <span className="text-terminal-muted">{exchange} · {market}</span>

        <button
          onClick={() => setFollowMode((m) => (m === 'auto' ? 'locked' : 'auto'))}
          title="Follow mode (r) — auto keeps the market centered"
          className="px-1.5 py-0.5 rounded border border-terminal-border text-terminal-muted hover:bg-terminal-accent/30 flex items-center gap-1"
        >
          {followMode === 'auto' ? <Crosshair size={11} /> : followMode === 'locked' ? <Lock size={11} /> : <MoveVertical size={11} />}
          {followMode}
        </button>
        <button
          onClick={() => { setCenterPrice(midPrice); setFollowMode('auto'); }}
          title="Snap to price (Shift)"
          className="px-1.5 py-0.5 rounded border border-terminal-border text-terminal-muted hover:bg-terminal-accent/30"
        >
          <Unlock size={11} />
        </button>

        <span className="text-terminal-muted">×{stepMultiplier}</span>

        <div className="flex-1" />

        <label className="flex items-center gap-1 text-terminal-muted">
          qty
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            className="w-16 bg-terminal-accent/30 rounded px-1 py-0.5 text-terminal-text outline-none border border-terminal-border"
          />
        </label>
        <button
          onClick={() => void place('buy', 'market')}
          disabled={busy || !canTrade}
          className="px-2 py-0.5 rounded bg-emerald-600/80 text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          Buy
        </button>
        <button
          onClick={() => void place('sell', 'market')}
          disabled={busy || !canTrade}
          className="px-2 py-0.5 rounded bg-red-600/80 text-white hover:bg-red-600 disabled:opacity-40"
        >
          Sell
        </button>
        <button
          onClick={() => void cancelAll()}
          disabled={busy || !openOrders.length}
          className="px-2 py-0.5 rounded border border-terminal-border text-terminal-muted hover:bg-terminal-accent/30 disabled:opacity-40"
        >
          Cancel all
        </button>
      </div>

      {/* Position / status strip */}
      <div className="flex items-center gap-3 mb-1 text-[10px] text-terminal-muted">
        {positionSize ? (
          <span className={positionSide === 'short' ? 'text-red-400' : 'text-emerald-400'}>
            {positionSide} {Math.abs(positionSize)} · PnL {unrealized >= 0 ? '+' : ''}{unrealized.toFixed(2)}
          </span>
        ) : (
          <span>flat</span>
        )}
        <span>{openOrders.length} working</span>
        <span>step {priceStep ? priceStep.toFixed(priceDecimals) : '—'}</span>
        {!canTrade && <span className="text-amber-400">no account — read-only</span>}
        <span className="ml-auto">t buy · y sell · d close · space cancel · esc flatten · r follow</span>
      </div>

      {error && <div className="mb-1 text-[10px] text-red-400 truncate" title={error}>{error}</div>}

      {/* Column head */}
      <div className="flex items-center px-1 py-0.5 text-[10px] text-terminal-muted border-b border-terminal-border">
        <div className="w-12 text-right">My</div>
        <div className="flex-1 text-right">Bid</div>
        <div className="w-24 text-center">Price</div>
        <div className="flex-1">Ask</div>
        <div className="w-12">My</div>
        <div className="w-14 text-right">Vol</div>
      </div>

      {/* Ladder */}
      <div ref={containerRef} className="flex-grow min-h-0 overflow-hidden" onWheel={onWheel}>
        {!rows.length ? (
          <div className="h-full flex items-center justify-center gap-2 text-terminal-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for the order book…
          </div>
        ) : (
          rows.map((row) => {
            const isAskSide = row.price > midPrice;
            const isLast = Math.abs(row.price - lastPrice) < priceStep / 2;
            const isSpread = row.price <= bestAsk && row.price >= bestBid;
            return (
              <div
                key={row.price}
                style={{ height: rowHeight }}
                className={`flex items-center px-1 border-b border-terminal-border/10 ${
                  isSpread ? 'bg-terminal-accent/20' : ''
                }`}
              >
                <div className="w-12 text-right text-[10px] text-amber-400">{row.myBid ? fmt(row.myBid, amountDecimals) : ''}</div>

                {/* Bid cell — click to bid here */}
                <button
                  onClick={() => void place('buy', 'limit', row.price)}
                  disabled={busy || !canTrade}
                  title={canTrade ? `Limit buy at ${row.price.toFixed(priceDecimals)}` : 'No account selected'}
                  className="flex-1 h-full relative text-right pr-1 disabled:cursor-not-allowed group"
                >
                  <span
                    className="absolute inset-y-0 right-0 bg-emerald-500/25 group-hover:bg-emerald-500/40"
                    style={{ width: `${Math.min(100, (row.bidSize / maxRowSize) * 100)}%` }}
                  />
                  <span className="relative text-emerald-300">{fmt(row.bidSize, amountDecimals)}</span>
                </button>

                <div
                  className={`w-24 text-center font-mono ${
                    isLast ? 'text-terminal-text font-semibold' : isAskSide ? 'text-red-300/80' : 'text-emerald-300/80'
                  }`}
                >
                  {row.price.toFixed(priceDecimals)}
                </div>

                {/* Ask cell — click to offer here */}
                <button
                  onClick={() => void place('sell', 'limit', row.price)}
                  disabled={busy || !canTrade}
                  title={canTrade ? `Limit sell at ${row.price.toFixed(priceDecimals)}` : 'No account selected'}
                  className="flex-1 h-full relative text-left pl-1 disabled:cursor-not-allowed group"
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-red-500/25 group-hover:bg-red-500/40"
                    style={{ width: `${Math.min(100, (row.askSize / maxRowSize) * 100)}%` }}
                  />
                  <span className="relative text-red-300">{fmt(row.askSize, amountDecimals)}</span>
                </button>

                <div className="w-12 text-[10px] text-amber-400">{row.myAsk ? fmt(row.myAsk, amountDecimals) : ''}</div>

                <div className="w-14 text-right relative">
                  <span
                    className="absolute inset-y-0 right-0 bg-terminal-muted/20"
                    style={{ width: `${Math.min(100, (row.traded / maxTraded) * 100)}%` }}
                  />
                  <span className="relative text-[10px] text-terminal-muted">{row.traded ? fmt(row.traded, amountDecimals) : ''}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DomLadderWidget;
