import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useGroupStore } from '../../store/groupStore';
import { useNotificationStore } from '../../store/notificationStore';
import { executeOrder, cancelOrder } from '../../services/orderExecutionService';
import { cancelAndFlatten } from '../../services/emergencyFlattenService';
import type { MarketType, Trade } from '../../types/dataProviders';
import {
  createPriceAxis,
  formatStep,
  snapToPrice,
  toggleFollowMode,
  withLastPrice,
  withPriceStep,
  withScroll,
  withZoom,
  type PriceAxis,
} from './scalper/priceAxis';
import {
  buildClusterCandles,
  buildTickCandles,
  inferTickSize,
  toOrderBookSnapshot,
} from './scalper/scalperFeed';
import { midPrice } from './scalper/scalperModel';
import {
  PANE_LABELS,
  PANE_ORDER_DEFAULT,
  reorderPanes,
  resizePanes,
  visiblePanes,
  type PaneId,
} from './scalper/panelLayout';
import { startOfToday, summarizePnl, unrealizedOf, type PnlSummary } from './scalper/scalperPnl';
import * as t from './scalper/scalperTheme';
import OrderBookPane from './scalper/panes/OrderBookPane';
import ClusterPane from './scalper/panes/ClusterPane';
import BubblePane from './scalper/panes/BubblePane';
import TickChartPane from './scalper/panes/TickChartPane';
import TapePane from './scalper/panes/TapePane';
import { OrderPane, PnlPane, PositionPane } from './scalper/panes/BottomPanes';
import { useScalperWidgetsStore } from '../../store/scalperWidgetStore';

/**
 * Scalper — the ported scalper.marketmaker panel: several views of the same
 * instrument sharing one price axis, so a price sits at the same height in all
 * of them. Cluster chart, bubbles and the DOM ladder are on by default; the tick
 * chart and tape are a keystroke away.
 *
 * Ported from scalper-iced (Unlicense). The Rust app read `{orderbook, clusters,
 * ticks}` off a Go aggregator; here those are built in the browser from the
 * terminal's own order-book and trade streams (see scalper/scalperFeed.ts).
 *
 * Interaction, all of it on the shared axis: wheel pans, Shift+wheel zooms,
 * Ctrl+wheel changes the price grouping, clicking the ladder places a limit
 * order at that price, and the panes are reorderable and resizable.
 */

/** Depth kept per side. Deeper than the screen is wasted work. */
const DEPTH_PER_SIDE = 60;
/** Own tape buffer: the shared one is capped app-wide and too short for clusters. */
const MAX_TRADES = 5000;
const CLUSTER_TIMEFRAMES = [1_000, 5_000, 15_000, 30_000, 60_000];
const TICKS_PER_CANDLE_OPTIONS = [10, 25, 50, 100];
const MAX_CLUSTER_CANDLES = 60;
const MAX_TICK_CANDLES = 120;
const PRIVATE_POLL_MS = 4000;

type TapeEntry = Trade & { key: string };

const ScalperWidget: React.FC<{ widgetId: string; selectedGroupId?: string }> = ({
  widgetId,
  selectedGroupId,
}) => {
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
  const showError = useNotificationStore(s => s.showError);
  const showSuccess = useNotificationStore(s => s.showSuccess);

  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const group = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();
  const exchange = group?.exchange || 'binance';
  const symbol = group?.tradingPair || 'BTC/USDT';
  const market = (group?.market as MarketType) || 'spot';
  const accountId = group?.account || '';
  const canTrade = !!accountId;

  // Everything the settings drawer can change lives in the store, so both edit
  // the same state and a pane turned off stays off across re-mounts.
  const settings = useScalperWidgetsStore(s => s.getWidget(widgetId));
  const updateWidget = useScalperWidgetsStore(s => s.updateWidget);
  const togglePaneInStore = useScalperWidgetsStore(s => s.togglePane);
  const { layout, clusterTimeframe, ticksPerCandle, quantity, volumeFilter } = settings;

  const [axis, setAxis] = useState<PriceAxis>(() => createPriceAxis(0.01));
  const [tape, setTape] = useState<TapeEntry[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [position, setPosition] = useState<any | null>(null);
  const [pnl, setPnl] = useState<PnlSummary>({ realized: 0, fees: 0, trades: 0, closedTrades: 0, winRate: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seenRef = useRef<Set<string>>(new Set());
  const draggingRef = useRef<PaneId | null>(null);
  const [dragging, setDragging] = useState<PaneId | null>(null);
  const resizeRef = useRef<{ left: PaneId; right: PaneId; startX: number; pxPerPortion: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tickSizeSetRef = useRef(false);
  const emergencyInFlightRef = useRef(false);

  const instrumentKey = `${exchange}:${market}:${symbol}`;

  // Switching instrument invalidates everything built from the old one.
  useEffect(() => {
    setTape([]);
    seenRef.current = new Set();
    tickSizeSetRef.current = false;
    setAxis(createPriceAxis(0.01));
  }, [instrumentKey]);

  // Market data.
  useEffect(() => {
    const subscriberId = `scalper-${widgetId}`;
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

  // Drain the shared tape into our own buffer. Clusters cover minutes, the
  // shared buffer holds ~1000 prints for the whole app; without this the
  // oldest cluster candles would keep losing their volume.
  useEffect(() => {
    const drain = () => {
      const fresh: TapeEntry[] = [];
      for (const trade of getTrades(exchange, symbol, market) as Trade[]) {
        if (typeof trade?.price !== 'number' || typeof trade?.timestamp !== 'number') continue;
        const key = String(trade.id ?? `${trade.timestamp}:${trade.price}:${trade.amount}:${trade.side}`);
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        fresh.push({ ...trade, key });
      }
      if (!fresh.length) return;
      setTape(prev => {
        const next = prev.concat(fresh).sort((a, b) => a.timestamp - b.timestamp);
        if (next.length <= MAX_TRADES) return next;
        const trimmed = next.slice(next.length - MAX_TRADES);
        seenRef.current = new Set(trimmed.map(e => e.key));
        return trimmed;
      });
    };
    drain();
    const id = window.setInterval(drain, 250);
    return () => window.clearInterval(id);
  }, [exchange, symbol, market, getTrades]);

  const rawBook = getOrderBook(exchange, symbol, market as any);
  const book = useMemo(() => toOrderBookSnapshot(rawBook, DEPTH_PER_SIDE), [rawBook]);

  // The instrument's tick, guessed once from the book, sets the floor for the
  // grouping ladder — everything Ctrl+wheel offers is a multiple of it.
  useEffect(() => {
    if (tickSizeSetRef.current || !book) return;
    const tickSize = inferTickSize(
      [...book.bids.map(l => l.price), ...book.asks.map(l => l.price)],
      0.01,
    );
    tickSizeSetRef.current = true;
    setAxis(prev => ({ ...prev, tickSize, displayStep: tickSize }));
  }, [book]);

  // Follow the mid, which is what the ladder is centred on.
  const mid = book ? midPrice(book) : 0;
  useEffect(() => {
    if (!mid) return;
    setAxis(prev => (prev.lastPrice === mid ? prev : withLastPrice(prev, mid)));
  }, [mid]);

  const clusters = useMemo(
    () => buildClusterCandles(tape, clusterTimeframe, axis.tickSize, MAX_CLUSTER_CANDLES),
    [tape, clusterTimeframe, axis.tickSize],
  );
  const ticks = useMemo(
    () => buildTickCandles(tape, ticksPerCandle, MAX_TICK_CANDLES),
    [tape, ticksPerCandle],
  );

  const ownOrders = useMemo(
    () =>
      openOrders
        .map(o => ({
          price: Number(o?.price),
          amount: Number(o?.remaining ?? o?.amount ?? 0),
          side: (o?.side === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
        }))
        .filter(o => Number.isFinite(o.price) && o.price > 0),
    [openOrders],
  );

  // --- private data --------------------------------------------------------

  const refreshPrivate = useCallback(async () => {
    if (!accountId) {
      setOpenOrders([]);
      setPosition(null);
      setPnl({ realized: 0, fees: 0, trades: 0, closedTrades: 0, winRate: 0 });
      return;
    }
    try {
      const orders = await fetchOpenOrders(accountId, symbol);
      setOpenOrders(Array.isArray(orders) ? orders : []);
    } catch {
      setOpenOrders([]);
    }
    if (market !== 'spot') {
      try {
        const positions = await fetchPositions(accountId, [symbol]);
        const match = (positions || []).find(
          (p: any) => p?.symbol === symbol && Math.abs(Number(p?.contracts ?? 0)) > 0,
        );
        setPosition(match ?? null);
      } catch {
        setPosition(null);
      }
    }
    // Session P&L from this account's own fills since local midnight. The
    // exchange is asked for the window, not the whole history.
    try {
      const since = startOfToday();
      const fills = await fetchMyTrades(accountId, symbol, since, 500);
      setPnl(summarizePnl((fills as any[]) ?? [], since));
    } catch {
      // Leave the last good summary rather than blanking the panel on a hiccup.
    }
  }, [accountId, symbol, market, fetchOpenOrders, fetchPositions, fetchMyTrades]);

  useEffect(() => {
    void refreshPrivate();
    const id = window.setInterval(() => void refreshPrivate(), PRIVATE_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshPrivate]);

  // --- trading -------------------------------------------------------------

  const place = useCallback(
    async (side: 'buy' | 'sell', type: 'limit' | 'market', price?: number) => {
      const amount = Number(quantity);
      if (!canTrade) {
        showError('No account selected', 'Pick an account in the group selector to trade');
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
        if (res.success) showSuccess(`${side.toUpperCase()} ${type}`, `${amount} ${symbol}`);
        else showError(`${side.toUpperCase()} failed`, res.error || 'Order rejected');
        await refreshPrivate();
      } catch (e) {
        showError(`${side.toUpperCase()} failed`, e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [quantity, canTrade, exchange, accountId, market, symbol, showError, showSuccess, refreshPrivate],
  );

  const cancelAll = useCallback(async () => {
    if (!canTrade || !openOrders.length) return;
    setBusy(true);
    try {
      const results = await Promise.all(
        openOrders.map(o => cancelOrder(String(o.id), symbol, exchange, accountId, market)),
      );
      const failed = results.filter(r => !r.success).length;
      if (failed) showError('Cancel all', `${failed} of ${results.length} orders could not be cancelled`);
      else showSuccess('Cancel all', `${results.length} order${results.length === 1 ? '' : 's'} cancelled`);
      await refreshPrivate();
    } finally {
      setBusy(false);
    }
  }, [canTrade, openOrders, symbol, exchange, accountId, market, showError, showSuccess, refreshPrivate]);

  const closePosition = useCallback(async () => {
    const size = Number(position?.contracts ?? 0);
    if (!canTrade || !size) return;
    setBusy(true);
    try {
      const res = await executeOrder({
        exchange,
        accountId,
        market,
        symbol,
        side: position?.side === 'short' ? 'buy' : 'sell',
        type: 'market',
        amount: Math.abs(size),
        reduceOnly: true,
      });
      if (res.success) showSuccess('Position closed', `${Math.abs(size)} ${symbol}`);
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

  // --- axis interaction ----------------------------------------------------

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // One notch is one row; trackpads report pixels, hence the divisor.
    const delta = e.deltaMode === 0 ? -e.deltaY / 20 : -e.deltaY;
    if (e.ctrlKey || e.metaKey) setAxis(prev => withPriceStep(prev, delta));
    else if (e.shiftKey) setAxis(prev => withZoom(prev, delta));
    else setAxis(prev => withScroll(prev, delta));
  }, []);

  const togglePane = useCallback((id: PaneId) => togglePaneInStore(widgetId, id), [togglePaneInStore, widgetId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.ctrlKey || e.metaKey) {
        const index = Number(e.key) - 1;
        const pane = PANE_ORDER_DEFAULT[index];
        if (pane) {
          e.preventDefault();
          togglePane(pane);
          return;
        }
      }

      switch (e.key) {
        case 'r':
          setAxis(toggleFollowMode);
          break;
        case 'Shift':
          setAxis(snapToPrice);
          break;
        case 't':
          void place('buy', 'market');
          break;
        case 'y':
          void place('sell', 'market');
          break;
        case 'd':
          void closePosition();
          break;
        case ' ':
          e.preventDefault();
          void cancelAll();
          break;
        case 'Escape':
          // Emergency: reconcile the exchange after cancel before sizing close.
          void emergencyCancelAndFlatten();
          break;
        default:
          return;
      }
    },
    [togglePane, place, closePosition, cancelAll, emergencyCancelAndFlatten],
  );

  // --- pane drag & divider resize ------------------------------------------

  const onDragStart = (id: PaneId) => {
    draggingRef.current = id;
    setDragging(id);
  };
  const onDragOver = (id: PaneId) => {
    const dragged = draggingRef.current;
    if (!dragged || dragged === id) return;
    updateWidget(widgetId, { layout: { ...layout, order: reorderPanes(layout.order, dragged, id) } });
  };
  const onDragEnd = () => {
    draggingRef.current = null;
    setDragging(null);
  };

  const startResize = (left: PaneId, right: PaneId, e: React.MouseEvent) => {
    const width = rootRef.current?.clientWidth || 1;
    const totalPortions = visiblePanes(layout).reduce((sum, id) => sum + layout.widths[id], 0);
    resizeRef.current = {
      left,
      right,
      startX: e.clientX,
      // Pixels per portion, so the divider tracks the cursor 1:1.
      pxPerPortion: width / Math.max(1, totalPortions),
    };
    e.preventDefault();
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const state = resizeRef.current;
      if (!state) return;
      const delta = (e.clientX - state.startX) / state.pxPerPortion;
      if (Math.abs(delta) < 0.5) return;
      const step = Math.round(delta);
      state.startX += step * state.pxPerPortion;
      // The listener is bound once, so the current layout is read from the store
      // rather than captured — a stale closure here would undo every drag.
      const store = useScalperWidgetsStore.getState();
      const current = store.getWidget(widgetId).layout;
      store.updateWidget(widgetId, {
        layout: { ...current, widths: resizePanes(current.widths, state.left, state.right, step) },
      });
    };
    const up = () => {
      resizeRef.current = null;
      onDragEnd();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [widgetId]);

  // --- render --------------------------------------------------------------

  const panes = visiblePanes(layout);
  const bottomSections = (['position', 'order', 'pnl'] as const).filter(id => settings.bottomVisible[id]);
  const unrealized = unrealizedOf(position);
  const modeColor =
    axis.followMode === 'auto' ? t.BID_GREEN : axis.followMode === 'locked' ? t.SPREAD_YELLOW : t.ASK_RED;

  const renderPane = (id: PaneId) => {
    switch (id) {
      case 'orderbook':
        return (
          <OrderBookPane
            book={book}
            axis={axis}
            openOrders={ownOrders}
            onWheel={handleWheel}
            onPriceClick={(price, side) => void place(side, 'limit', price)}
          />
        );
      case 'cluster':
        return <ClusterPane candles={clusters} axis={axis} onWheel={handleWheel} />;
      case 'bubble':
        return <BubblePane candles={ticks} axis={axis} onWheel={handleWheel} />;
      case 'tick':
        return <TickChartPane candles={ticks} axis={axis} onWheel={handleWheel} />;
      case 'tape':
        return <TapePane candles={ticks} volumeFilter={volumeFilter} onVolumeFilterChange={value => updateWidget(widgetId, { volumeFilter: value })} />;
    }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full flex flex-col outline-none text-xs"
      style={{ background: t.BACKGROUND, color: t.TEXT_PRIMARY }}
    >
      {/* Header: instrument, axis state, pane toggles, order size. Can be hidden
          from the settings drawer for a chart-only layout. */}
      <div
        className="flex items-center gap-2 px-2 py-1 flex-wrap shrink-0"
        style={{ background: t.HEADER_BG, display: settings.showHeader ? undefined : 'none' }}
      >
        <span style={{ color: t.TEXT_BRIGHT }}>{symbol}</span>
        <span style={{ color: t.TEXT_DIM }}>{exchange} · {market}</span>
        <span style={{ color: t.SPREAD_YELLOW }}>{axis.lastPrice ? axis.lastPrice.toFixed(2) : '—'}</span>

        <span style={{ color: modeColor }} title="r toggles follow, Shift re-centres">
          {axis.followMode.toUpperCase()}
        </span>
        <button
          onClick={() => setAxis(snapToPrice)}
          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
          style={{ color: t.TEXT_BRIGHT }}
        >
          Center
        </button>
        <span style={{ color: t.TEXT_DIM }}>step {formatStep(axis.displayStep)}</span>

        <div className="flex items-center gap-1">
          {layout.order.map(id => (
            <button
              key={id}
              onMouseDown={() => onDragStart(id)}
              onMouseEnter={() => onDragOver(id)}
              onMouseUp={onDragEnd}
              onClick={() => togglePane(id)}
              title={`${PANE_LABELS[id]} — click to toggle, drag to reorder`}
              className="px-1.5 py-0.5 rounded"
              style={{
                background:
                  dragging === id
                    ? 'rgba(102,178,255,0.5)'
                    : layout.visible[id]
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.04)',
                color: layout.visible[id] ? t.TEXT_BRIGHT : t.TEXT_DIM,
              }}
            >
              {PANE_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <select
          value={clusterTimeframe}
          onChange={e => updateWidget(widgetId, { clusterTimeframe: Number(e.target.value) })}
          title="Cluster candle duration"
          className="bg-black/30 rounded px-1 py-0.5 border border-white/10"
          style={{ color: t.TEXT_PRIMARY }}
        >
          {CLUSTER_TIMEFRAMES.map(ms => (
            <option key={ms} value={ms}>{ms < 60_000 ? `${ms / 1000}s` : '1m'}</option>
          ))}
        </select>
        <select
          value={ticksPerCandle}
          onChange={e => updateWidget(widgetId, { ticksPerCandle: Number(e.target.value) })}
          title="Prints per tick candle"
          className="bg-black/30 rounded px-1 py-0.5 border border-white/10"
          style={{ color: t.TEXT_PRIMARY }}
        >
          {TICKS_PER_CANDLE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} ticks</option>
          ))}
        </select>

        <input
          value={quantity}
          onChange={e => updateWidget(widgetId, { quantity: e.target.value })}
          title="Order size"
          inputMode="decimal"
          className="w-16 bg-black/30 rounded px-1 py-0.5 border border-white/10"
          style={{ color: t.TEXT_PRIMARY }}
        />
        <button
          onClick={() => void place('buy', 'market')}
          disabled={busy || !canTrade}
          title="Buy at market (t)"
          className="px-1.5 py-0.5 rounded disabled:opacity-40"
          style={{ background: t.BID_GREEN, color: '#04120f' }}
        >
          Buy
        </button>
        <button
          onClick={() => void place('sell', 'market')}
          disabled={busy || !canTrade}
          title="Sell at market (y)"
          className="px-1.5 py-0.5 rounded disabled:opacity-40"
          style={{ background: t.ASK_RED, color: '#1a0505' }}
        >
          Sell
        </button>
        <button
          onClick={() => void cancelAll()}
          disabled={busy || !openOrders.length}
          title="Cancel all working orders (Space)"
          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
          style={{ color: t.TEXT_BRIGHT }}
        >
          Cancel {openOrders.length || ''}
        </button>
        {position && (
          <button
            onClick={() => void closePosition()}
            disabled={busy}
            title="Flatten the position (d)"
            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40"
            style={{ color: t.SPREAD_YELLOW }}
          >
            Close {Number(position.contracts).toFixed(4)}
          </button>
        )}
      </div>

      {error && <div className="px-2 py-0.5 truncate" style={{ color: t.ASK_RED }} title={error}>{error}</div>}

      {/* Panes, in order, separated by draggable dividers */}
      <div className="flex-grow min-h-0 flex">
        {panes.map((id, i) => (
          <React.Fragment key={id}>
            {i > 0 && (
              <div
                onMouseDown={e => startResize(panes[i - 1], id, e)}
                className="w-1 cursor-col-resize shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />
            )}
            <div className="min-w-0 h-full" style={{ flex: `${layout.widths[id]} 1 0%` }}>
              {renderPane(id)}
            </div>
          </React.Fragment>
        ))}
        {!panes.length && (
          <div className="flex-1 flex items-center justify-center" style={{ color: t.TEXT_DIM }}>
            Every pane is hidden — turn one back on in the header or the settings
          </div>
        )}
      </div>

      {/* Bottom bar: position, order entry, session P&L. Each section is
          independently switchable from the settings drawer. */}
      {settings.showBottomBar && bottomSections.length > 0 && (
        <div className="shrink-0 flex gap-0.5 mt-0.5">
          {bottomSections.includes('position') && (
            <PositionPane
              position={position}
              unrealized={unrealized}
              openOrderCount={openOrders.length}
              busy={busy}
              onClose={() => void closePosition()}
              onCancelAll={() => void cancelAll()}
            />
          )}
          {bottomSections.includes('order') && (
            <OrderPane
              quantity={quantity}
              onQuantityChange={value => updateWidget(widgetId, { quantity: value })}
              busy={busy}
              canTrade={canTrade}
              onBuy={() => void place('buy', 'market')}
              onSell={() => void place('sell', 'market')}
            />
          )}
          {bottomSections.includes('pnl') && <PnlPane summary={pnl} unrealized={unrealized} />}
        </div>
      )}
    </div>
  );
};

export default ScalperWidget;
