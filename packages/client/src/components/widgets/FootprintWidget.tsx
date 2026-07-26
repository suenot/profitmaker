import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Grid3x3 } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useGroupStore } from '../../store/groupStore';
import type { MarketType } from '../../types/dataProviders';
import { Footprint } from './charts/Footprint';
import { autoPriceStep, buildFootprintCandles } from './charts/footprintAggregator';

/**
 * Footprint / cluster chart.
 *
 * Candles are built here, from the live trade tape, because no exchange serves
 * this shape: a footprint is trades bucketed twice over — by time into candles,
 * and by price into levels — with the aggressor side deciding which column a
 * trade lands in (a buy lifts the ask, so it counts as ask volume). Same
 * two-axis bucketing the standalone scalper backend does server-side; doing it
 * in the widget keeps it live with zero backend work, at the cost of only
 * covering what the tape buffer holds.
 */

const TIMEFRAMES: { label: string; ms: number }[] = [
  { label: '5s', ms: 5_000 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
];

/** Multipliers applied to the auto-derived price step. */
const STEP_MULTIPLIERS = [1, 2, 5, 10];

const FootprintWidget: React.FC<{ widgetId: string; selectedGroupId?: string }> = ({ widgetId, selectedGroupId }) => {
  const { subscribe, unsubscribe, getTrades, initializeTradesData } = useDataProviderStore();
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();

  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const group = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();
  const exchange = group?.exchange || 'binance';
  const symbol = group?.tradingPair || 'BTC/USDT';
  const market = (group?.market as MarketType) || 'spot';

  const [timeframeMs, setTimeframeMs] = useState(60_000);
  const [stepMultiplier, setStepMultiplier] = useState(1);
  const [mode, setMode] = useState<'numbers' | 'profile'>('numbers');
  const [imbalanceRatio, setImbalanceRatio] = useState(3);
  const [showPOC, setShowPOC] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [maxCandles, setMaxCandles] = useState(12);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscriberId = `footprint-${widgetId}`;
    let cancelled = false;
    const start = async () => {
      try {
        await initializeTradesData(exchange, symbol, market);
        if (cancelled) return;
        await subscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void start();
    return () => {
      cancelled = true;
      unsubscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
    };
  }, [exchange, symbol, market, widgetId, subscribe, unsubscribe, initializeTradesData]);

  const trades = getTrades(exchange, symbol, market);

  // Auto step from the price range actually traded, so the ladder has roughly
  // TARGET_ROWS rows regardless of the instrument's price magnitude.
  const autoStep = useMemo(() => autoPriceStep(trades), [trades]);

  const priceStep = autoStep * stepMultiplier;

  const candles = useMemo(
    () => buildFootprintCandles(trades, timeframeMs, priceStep, maxCandles),
    [trades, timeframeMs, priceStep, maxCandles],
  );

  const priceDecimals = useMemo(() => {
    if (!priceStep) return 2;
    if (priceStep >= 10) return 0;
    if (priceStep >= 1) return 1;
    return Math.min(8, Math.max(2, Math.ceil(-Math.log10(priceStep))));
  }, [priceStep]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
        <span className="text-terminal-text font-medium">{symbol}</span>
        <span className="text-terminal-muted">{exchange} · {market}</span>

        <select
          value={timeframeMs}
          onChange={(e) => setTimeframeMs(Number(e.target.value))}
          className="bg-terminal-accent/30 text-terminal-text rounded px-1.5 py-0.5 border border-terminal-border"
        >
          {TIMEFRAMES.map((tf) => <option key={tf.ms} value={tf.ms}>{tf.label}</option>)}
        </select>

        <div className="flex rounded overflow-hidden border border-terminal-border">
          {STEP_MULTIPLIERS.map((m) => (
            <button
              key={m}
              onClick={() => setStepMultiplier(m)}
              title={`Price step ×${m}`}
              className={`px-1.5 py-0.5 ${
                stepMultiplier === m ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
              }`}
            >
              ×{m}
            </button>
          ))}
        </div>

        <div className="flex rounded overflow-hidden border border-terminal-border">
          {(['numbers', 'profile'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-1.5 py-0.5 ${
                mode === m ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <label className="flex items-center gap-1 text-terminal-muted">
          imb
          <input
            value={imbalanceRatio}
            onChange={(e) => setImbalanceRatio(Math.max(1, Number(e.target.value) || 1))}
            inputMode="numeric"
            className="w-10 bg-terminal-accent/30 rounded px-1 py-0.5 text-terminal-text outline-none border border-terminal-border"
          />
        </label>
        <label className="flex items-center gap-1 text-terminal-muted">
          bars
          <input
            value={maxCandles}
            onChange={(e) => setMaxCandles(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
            inputMode="numeric"
            className="w-10 bg-terminal-accent/30 rounded px-1 py-0.5 text-terminal-text outline-none border border-terminal-border"
          />
        </label>
        <button
          onClick={() => setShowPOC((v) => !v)}
          className={`px-1.5 py-0.5 rounded border border-terminal-border ${
            showPOC ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
          }`}
        >
          POC
        </button>
        <button
          onClick={() => setShowDelta((v) => !v)}
          className={`px-1.5 py-0.5 rounded border border-terminal-border ${
            showDelta ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
          }`}
        >
          Δ
        </button>
      </div>

      {error && <div className="mb-2 text-xs text-red-400 truncate" title={error}>{error}</div>}

      <div className="flex-grow min-h-0">
        {!candles.length ? (
          <div className="h-full flex flex-col items-center justify-center text-terminal-muted gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Waiting for trades…</span>
          </div>
        ) : (
          <Footprint
            candles={candles}
            mode={mode}
            imbalanceRatio={imbalanceRatio}
            showPOC={showPOC}
            showDelta={showDelta}
            tickSize={priceStep}
            priceDecimals={priceDecimals}
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-1 text-[10px] text-terminal-muted">
        <Grid3x3 size={11} />
        <span>
          {candles.length} bars · step {priceStep ? priceStep.toFixed(priceDecimals) : '—'} · built from the live tape
          ({trades.length} trades buffered)
        </span>
      </div>
    </div>
  );
};

export default FootprintWidget;
