import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, User, Search, AlertTriangle, Check, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useUserStore } from '../../store/userStore';
import { chunk, pickMissing } from './leverageLoad';
import type { LeverageMarket, LeverageMarketType, LeverageSetting, SetLeverageResult } from '@profitmaker/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

/**
 * Leverages — what leverage each derivative pair is set to on one account, and
 * the tooling to change it.
 *
 * Two data sources, deliberately separate: the exchange's published cap per pair
 * (cheap, comes with market metadata, covers everything) and the account's own
 * current setting (private; some exchanges hand over the whole set in one call,
 * others only answer per symbol). So the table shows caps immediately and fills
 * in current values as they arrive: one batch call first, then the rows actually
 * on screen are read automatically as you scroll or filter, and "Load all" walks
 * whatever is left.
 *
 * The per-viewport read is what makes this usable on bybit, where there is no
 * batch call at all and the only no-symbol source (open positions) says nothing
 * about the hundreds of pairs the account is flat on.
 */

// Buckets for the distribution donut. Ranges are inclusive on both ends.
const BUCKETS: { label: string; min: number; max: number; color: string }[] = [
  { label: '1x', min: 1, max: 1, color: '#6B7280' },
  { label: '2-5x', min: 2, max: 5, color: '#10B981' },
  { label: '6-10x', min: 6, max: 10, color: '#3B82F6' },
  { label: '11-20x', min: 11, max: 20, color: '#F59E0B' },
  { label: '21-50x', min: 21, max: 50, color: '#F97316' },
  { label: '50x+', min: 51, max: Infinity, color: '#EF4444' },
];

// Server-side caps (see MAX_LEVERAGE_*_BATCH in routes/exchange.ts). Reads are
// cheap, writes are a round-trip to the exchange each, hence the smaller chunk.
const READ_CHUNK = 50;
const WRITE_CHUNK = 20;

// Row geometry for the virtualizer, and how long scrolling has to settle before
// the visible rows are read (flicking through 700 pairs must not fire a request
// per frame).
const ROW_HEIGHT = 34;
const AUTO_READ_DEBOUNCE_MS = 250;

type Row = LeverageMarket & { current?: LeverageSetting };

function bucketOf(leverage: number) {
  return BUCKETS.find(b => leverage >= b.min && leverage <= b.max) ?? BUCKETS[BUCKETS.length - 1];
}

const LeveragesWidget: React.FC<{ widgetId: string; selectedGroupId?: string }> = () => {
  const { leverageMarkets, fetchLeverages, setLeverages } = useDataProviderStore();
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  const accounts = useMemo(() => activeUser?.accounts?.filter(acc => !!acc.id) || [], [activeUser?.accounts]);

  const [accountId, setAccountId] = useState<string>('');
  const [marketType, setMarketType] = useState<LeverageMarketType>('swap');
  const [markets, setMarkets] = useState<LeverageMarket[]>([]);
  const [current, setCurrent] = useState<Map<string, LeverageSetting>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Long-running work (load-all / bulk set) reports through these and is
  // cancelled by flipping the ref — checked between chunks.
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const cancelRef = useRef(false);
  const [results, setResults] = useState<SetLeverageResult[]>([]);
  const [pendingBulk, setPendingBulk] = useState<{ target: number | 'max'; symbols: string[] } | null>(null);
  const [bulkValue, setBulkValue] = useState('10');
  const [rowValues, setRowValues] = useState<Record<string, string>>({});

  // Every symbol a read was already issued for, answered or not. Kept out of
  // state on purpose: it must not re-render, and it must not make a pair the
  // exchange stays silent about get re-requested on every scroll tick.
  const attemptedRef = useRef<Set<string>>(new Set());
  const [autoReading, setAutoReading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const account = accounts.find(a => a.id === accountId);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    setResults([]);
    attemptedRef.current = new Set();
    try {
      const list = await leverageMarkets(accountId, marketType);
      setMarkets(list);
      // Whatever the exchange gives up in one call — often only pairs with a
      // position or an explicitly changed leverage. The rest stays blank until
      // "Load all".
      const batch = await fetchLeverages(accountId);
      setCurrent(new Map(batch.filter(l => l.symbol).map(l => [l.symbol, l])));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMarkets([]);
      setCurrent(new Map());
    } finally {
      setLoading(false);
    }
  }, [accountId, marketType, leverageMarkets, fetchLeverages]);

  useEffect(() => {
    setMarkets([]);
    setCurrent(new Map());
    load();
  }, [load]);

  const rows: Row[] = useMemo(
    () => markets.map(m => ({ ...m, current: current.get(m.symbol) })),
    [markets, current],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? rows.filter(r => r.symbol.toUpperCase().includes(q)) : rows;
  }, [rows, search]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();

  // Rows on screen (plus overscan). The join is the effect's trigger: it only
  // changes when the window itself moves, not on every render.
  const visibleSymbols = virtualRows.map(v => filtered[v.index]?.symbol).filter(Boolean) as string[];
  const visibleKey = visibleSymbols.join(',');

  /**
   * Read leverage for whatever is on screen. This is the widget's main data
   * path: exchanges without a batch call answer per symbol, and asking for the
   * ~30 rows a user is looking at costs a fraction of a full sweep.
   */
  useEffect(() => {
    if (!accountId || loading || progress) return;
    const wanted = pickMissing(visibleSymbols, current, attemptedRef.current, READ_CHUNK);
    if (!wanted.length) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      wanted.forEach(s => attemptedRef.current.add(s));
      setAutoReading(true);
      try {
        const batch = await fetchLeverages(accountId, wanted);
        if (cancelled) return;
        setCurrent(prev => {
          const next = new Map(prev);
          batch.forEach(l => l.symbol && next.set(l.symbol, l));
          return next;
        });
      } catch (e) {
        // Keep the symbols marked as attempted — a failing read that retried on
        // every scroll tick would hammer the exchange. Reload clears the set.
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setAutoReading(false);
      }
    }, AUTO_READ_DEBOUNCE_MS);

    return () => { cancelled = true; clearTimeout(timer); };
    // visibleKey stands in for visibleSymbols (recreated every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, accountId, current, loading, progress, fetchLeverages]);

  const known = filtered.filter(r => r.current?.leverage);
  const pieData = useMemo(() => {
    const counts = new Map<string, number>();
    known.forEach(r => {
      const b = bucketOf(r.current!.leverage!);
      counts.set(b.label, (counts.get(b.label) || 0) + 1);
    });
    return BUCKETS.filter(b => counts.get(b.label)).map(b => ({
      label: b.label,
      color: b.color,
      count: counts.get(b.label)!,
    }));
  }, [known]);

  /** Fill in the pairs the batch call didn't cover, chunk by chunk. */
  const loadAll = useCallback(async () => {
    const missing = rows.filter(r => !r.current).map(r => r.symbol);
    if (!missing.length) return;
    cancelRef.current = false;
    const chunks = chunk(missing, READ_CHUNK);
    setProgress({ done: 0, total: missing.length, label: 'Loading leverages' });
    try {
      let done = 0;
      for (const part of chunks) {
        if (cancelRef.current) break;
        part.forEach(s => attemptedRef.current.add(s));
        const batch = await fetchLeverages(accountId, part);
        setCurrent(prev => {
          const next = new Map(prev);
          batch.forEach(l => l.symbol && next.set(l.symbol, l));
          return next;
        });
        done += part.length;
        setProgress({ done, total: missing.length, label: 'Loading leverages' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }, [rows, accountId, fetchLeverages]);

  /** Write leverage to a list of pairs, chunked, collecting per-symbol results. */
  const runSet = useCallback(async (symbols: string[], target: number | 'max') => {
    cancelRef.current = false;
    setResults([]);
    setProgress({ done: 0, total: symbols.length, label: target === 'max' ? 'Setting max leverage' : `Setting ${target}x` });
    const collected: SetLeverageResult[] = [];
    try {
      let done = 0;
      for (const part of chunk(symbols, WRITE_CHUNK)) {
        if (cancelRef.current) break;
        const res = await setLeverages(accountId, part, target);
        collected.push(...res);
        // Reflect the new values immediately — re-reading every pair after a
        // bulk run would double the API traffic for no new information.
        setCurrent(prev => {
          const next = new Map(prev);
          res.filter(r => r.success).forEach(r => {
            const prevRow = next.get(r.symbol);
            next.set(r.symbol, { ...prevRow, symbol: r.symbol, leverage: r.leverage, source: prevRow?.source ?? 'fetchLeverage' });
          });
          return next;
        });
        done += part.length;
        setProgress({ done, total: symbols.length, label: target === 'max' ? 'Setting max leverage' : `Setting ${target}x` });
        setResults([...collected]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }, [accountId, setLeverages]);

  const failures = results.filter(r => !r.success);
  const succeeded = results.filter(r => r.success).length;

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">Not signed in</h3>
        <p className="text-terminal-muted">Sign in with your MarketMaker account to view leverages</p>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="h-10 w-10 text-terminal-text/60 mb-3" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No exchange accounts</h3>
        <p className="text-terminal-muted">Add an exchange account to inspect leverage settings</p>
      </div>
    );
  }

  const missingCount = rows.filter(r => !r.current).length;
  const busy = !!progress;

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Account / market selectors */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          disabled={busy}
          className="bg-terminal-accent/30 text-terminal-text rounded px-2 py-1 text-xs border border-terminal-border disabled:opacity-50"
        >
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.label || acc.email || acc.exchange} · {acc.exchange}
            </option>
          ))}
        </select>

        <div className="flex rounded overflow-hidden border border-terminal-border">
          {(['swap', 'future'] as LeverageMarketType[]).map(mt => (
            <button
              key={mt}
              onClick={() => setMarketType(mt)}
              disabled={busy}
              className={`px-2 py-1 text-xs disabled:opacity-50 ${
                marketType === mt ? 'bg-terminal-accent text-terminal-text' : 'text-terminal-muted hover:bg-terminal-accent/30'
              }`}
            >
              {mt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-terminal-accent/20 rounded px-2 py-1 flex-1 min-w-[120px]">
          <Search size={12} className="text-terminal-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter pairs"
            className="bg-transparent text-xs text-terminal-text outline-none w-full"
          />
        </div>

        <button
          onClick={load}
          disabled={loading || busy}
          title="Reload"
          className="p-1.5 rounded hover:bg-terminal-accent/50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={`text-terminal-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
        <span className="text-terminal-muted flex items-center gap-1">
          {autoReading && <Loader2 className="h-3 w-3 animate-spin" />}
          {filtered.length} pair{filtered.length === 1 ? '' : 's'} · {known.length} with a known leverage
        </span>
        {missingCount > 0 && (
          <button
            onClick={loadAll}
            disabled={busy || loading}
            className="px-2 py-1 rounded bg-terminal-accent/40 text-terminal-text hover:bg-terminal-accent/60 disabled:opacity-50"
          >
            Load all ({missingCount})
          </button>
        )}
        <div className="flex-1" />
        <input
          value={bulkValue}
          onChange={e => setBulkValue(e.target.value)}
          inputMode="numeric"
          className="w-14 bg-terminal-accent/30 rounded px-2 py-1 text-terminal-text outline-none border border-terminal-border"
        />
        <button
          onClick={() => {
            const target = Number(bulkValue);
            if (!(target >= 1)) return;
            setPendingBulk({ target, symbols: filtered.map(r => r.symbol) });
          }}
          disabled={busy || !filtered.length}
          className="px-2 py-1 rounded bg-terminal-accent/40 text-terminal-text hover:bg-terminal-accent/60 disabled:opacity-50"
        >
          Set all shown
        </button>
        <button
          onClick={() => setPendingBulk({ target: 'max', symbols: filtered.filter(r => r.maxLeverage).map(r => r.symbol) })}
          disabled={busy || !filtered.some(r => r.maxLeverage)}
          className="px-2 py-1 rounded bg-amber-600/70 text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Set all to max
        </button>
      </div>

      {/* Progress / results strip */}
      {progress && (
        <div className="flex items-center gap-2 mb-2 text-xs text-terminal-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{progress.label}: {progress.done}/{progress.total}</span>
          <div className="flex-grow h-1 rounded-full bg-terminal-border/40 overflow-hidden max-w-[200px]">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <button onClick={() => { cancelRef.current = true; }} className="text-terminal-text hover:underline">
            Stop
          </button>
        </div>
      )}
      {!progress && results.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Check size={12} className="text-emerald-500" />
          <span className="text-terminal-muted">{succeeded} applied</span>
          {failures.length > 0 && (
            <>
              <X size={12} className="text-red-400" />
              <span className="text-red-400">{failures.length} failed</span>
              <span className="text-terminal-muted truncate">— {failures[0].symbol}: {failures[0].message}</span>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="mb-2 text-xs text-red-400 truncate" title={error}>{error}</div>
      )}

      {/* Distribution donut — counts of pairs per leverage bucket */}
      {pieData.length > 0 && (
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="h-24 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={22} outerRadius={40} paddingAngle={1} stroke="none">
                  {pieData.map(d => <Cell key={d.label} fill={d.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(24,24,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#ece8e1' }}
                  formatter={(value: any, _n: any, p: any) => [`${value} pairs`, p?.payload?.label]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {pieData.map(d => (
              <span key={d.label} className="flex items-center gap-1 text-terminal-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}: <span className="text-terminal-text">{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pair table — virtualized, both to keep 700+ rows cheap and because the
          rendered window is what drives the leverage reads. */}
      <div ref={listRef} className="flex-grow overflow-auto">
        <div className="flex items-center py-2 px-2 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50 sticky top-0 z-10">
          <div className="flex-1">Pair</div>
          <div className="w-20 text-right">Leverage</div>
          <div className="w-16 text-right">Max</div>
          <div className="w-20 text-right">Margin</div>
          <div className="w-28 text-right">Set</div>
        </div>

        {loading && !rows.length ? (
          <div className="flex items-center justify-center gap-2 py-8 text-terminal-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading markets…
          </div>
        ) : !filtered.length ? (
          <div className="py-8 text-center text-terminal-muted text-xs">
            {account ? `No ${marketType} pairs on ${account.exchange}` : 'No pairs'}
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualRows.map(virtualRow => {
              const row = filtered[virtualRow.index];
              if (!row) return null;
              const lev = row.current?.leverage;
              const atMax = !!(lev && row.maxLeverage && lev >= Math.floor(row.maxLeverage));
              const pending = !row.current && attemptedRef.current.has(row.symbol);
              return (
                <div
                  key={row.symbol}
                  className="flex items-center px-2 border-b border-terminal-border/20 hover:bg-terminal-accent/10 absolute top-0 left-0 w-full"
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="flex-1 truncate text-terminal-text">{row.symbol}</div>
                  <div className={`w-20 text-right ${lev ? (atMax ? 'text-amber-400' : 'text-terminal-text') : 'text-terminal-muted'}`}>
                    {lev ? `${lev}x` : pending ? '·' : '—'}
                  </div>
                  <div className="w-16 text-right text-terminal-muted">
                    {row.maxLeverage ? `${Math.floor(row.maxLeverage)}x` : '—'}
                  </div>
                  <div className="w-20 text-right text-terminal-muted truncate">{row.current?.marginMode || '—'}</div>
                  <div className="w-28 flex items-center justify-end gap-1">
                    <input
                      value={rowValues[row.symbol] ?? ''}
                      onChange={e => setRowValues(v => ({ ...v, [row.symbol]: e.target.value }))}
                      placeholder={row.maxLeverage ? String(Math.floor(row.maxLeverage)) : '10'}
                      inputMode="numeric"
                      disabled={busy}
                      className="w-12 bg-terminal-accent/30 rounded px-1 py-0.5 text-xs text-terminal-text outline-none border border-terminal-border disabled:opacity-50"
                    />
                    <button
                      onClick={() => {
                        const value = Number(rowValues[row.symbol] ?? row.maxLeverage ?? 0);
                        if (!(value >= 1)) return;
                        runSet([row.symbol], value);
                      }}
                      disabled={busy}
                      className="px-1.5 py-0.5 rounded bg-terminal-accent/40 text-xs text-terminal-text hover:bg-terminal-accent/60 disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk confirmation — writing leverage across a whole exchange is not
          undoable in one click, so it always goes through this. */}
      <AlertDialog open={!!pendingBulk} onOpenChange={open => !open && setPendingBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulk?.target === 'max' ? 'Set maximum leverage' : `Set ${pendingBulk?.target}x leverage`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk?.symbols.length} {marketType} pair{pendingBulk?.symbols.length === 1 ? '' : 's'} on{' '}
              {account?.label || account?.email || account?.exchange} ({account?.exchange}) will be changed
              {pendingBulk?.target === 'max' ? ' to each pair\'s published maximum' : ''}. Pairs with an open position
              are refused by the exchange and reported as failures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBulk) runSet(pendingBulk.symbols, pendingBulk.target);
                setPendingBulk(null);
              }}
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeveragesWidget;
