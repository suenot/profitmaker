import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { TrendsData, TrendingExchange, TrendingTicker } from '../shared/types';

type Window = '7d' | '30d';
type Kind = 'tickers' | 'exchanges';
const REFRESH_MS = 300_000;

function ChangeCell({ value, trend }: { value: number; trend: 'up' | 'down' | 'stable' }) {
  const cls = trend === 'up' ? 'pm-lw-chg--up' : trend === 'down' ? 'pm-lw-chg--down' : 'pm-lw-chg--stable';
  return <span className={`pm-lw-chg ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

export function TrendsWidget(_props: WidgetProps) {
  const terminal = getTerminal();
  const [data, setData] = React.useState<TrendsData | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);
  const [win, setWin] = React.useState<Window>('7d');
  const [kind, setKind] = React.useState<Kind>('tickers');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/trends');
        if (!alive) return;
        if (!res.ok) { setError(res.status === 503 ? 'module not configured' : 'ListingAPIs unavailable'); return; }
        const body = (await res.json()) as { trends: TrendsData | null; updatedAt: number | null };
        setError(null); setData(body.trends); setUpdatedAt(body.updatedAt);
      } catch { if (alive) setError('connection error'); }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [terminal]);

  const tickers: TrendingTicker[] = data?.trending_tickers[win === '7d' ? 'last_7_days' : 'last_30_days'] ?? [];
  const exchanges: TrendingExchange[] = data?.trending_exchanges[win === '7d' ? 'last_7_days' : 'last_30_days'] ?? [];

  return (
    <div className="pm-lw-trends">
      <div className="pm-lw-tabs">
        {(['7d', '30d'] as Window[]).map((w) => (
          <button key={w} className={`pm-lw-tab ${win === w ? 'pm-lw-tab--active' : ''}`} onClick={() => setWin(w)}>{w}</button>
        ))}
        <span className="pm-lw-tabs__spacer" />
        {(['tickers', 'exchanges'] as Kind[]).map((k) => (
          <button key={k} className={`pm-lw-tab ${kind === k ? 'pm-lw-tab--active' : ''}`} onClick={() => setKind(k)}>{k}</button>
        ))}
      </div>
      {error && <div className="pm-lw-banner">{error}</div>}
      <div className="pm-lw-trends__rows">
        {kind === 'tickers'
          ? tickers.map((t) => (
            <div key={t.ticker_symbol} className="pm-lw-trow">
              <span className="pm-lw-trow__rank">{t.rank}</span>
              <span className="pm-lw-trow__sym" title={t.ticker_full_name}>{t.ticker_symbol}</span>
              <span className="pm-lw-trow__num">{t.listings_count} listings</span>
              <span className="pm-lw-trow__num">{t.exchanges_count} ex</span>
              <ChangeCell value={t.change_percentage} trend={t.trend} />
            </div>
          ))
          : exchanges.map((e) => (
            <div key={e.exchange_slug} className="pm-lw-trow">
              <span className="pm-lw-trow__rank">{e.rank}</span>
              <span className="pm-lw-trow__sym">{e.exchange_name}</span>
              <span className="pm-lw-trow__num">{e.listings_count} listings</span>
              <span className="pm-lw-trow__num">{e.unique_tickers} coins</span>
              <ChangeCell value={e.change_percentage} trend={e.trend} />
            </div>
          ))}
        {!error && ((kind === 'tickers' && tickers.length === 0) || (kind === 'exchanges' && exchanges.length === 0)) && (
          <div className="pm-lw-empty">no trends data yet…</div>
        )}
      </div>
      {data?.metadata?.last_updated && (
        <div className="pm-lw-footer">updated {new Date(data.metadata.last_updated).toLocaleString()}</div>
      )}
    </div>
  );
}
