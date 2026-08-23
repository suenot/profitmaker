import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { StatsData } from '../shared/types';

const REFRESH_MS = 300_000;

export function StatsWidget(_props: WidgetProps) {
  const terminal = getTerminal();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/stats');
        if (!alive) return;
        if (!res.ok) { setError(res.status === 503 ? 'module not configured' : 'ListingAPIs unavailable'); return; }
        setError(null);
        setStats(((await res.json()) as { stats: StatsData | null }).stats);
      } catch { if (alive) setError('connection error'); }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [terminal]);

  const g = stats?.global_stats;
  const a = stats?.activity_stats;
  const quotes = stats?.pair_stats?.most_common_quote_currencies?.slice(0, 6) ?? [];

  return (
    <div className="pm-lw-stats">
      {error && <div className="pm-lw-banner">{error}</div>}
      <div className="pm-lw-stats__tiles">
        {[
          ['listings', g?.total_listings], ['exchanges', g?.total_exchanges],
          ['tickers', g?.total_tickers], ['pairs', g?.total_pairs],
        ].map(([label, value]) => (
          <div key={String(label)} className="pm-lw-tile">
            <div className="pm-lw-tile__value">{value ?? '—'}</div>
            <div className="pm-lw-tile__label">{label}</div>
          </div>
        ))}
      </div>
      <div className="pm-lw-stats__section">New listings</div>
      <div className="pm-lw-stats__activity">
        {a && ([['24h', a.last_24_hours], ['7d', a.last_7_days], ['30d', a.last_30_days]] as const).map(([label, p]) => (
          <div key={label} className="pm-lw-act">
            <div className="pm-lw-act__label">{label}</div>
            <div className="pm-lw-act__value">{p.new_listings + p.new_pairs}</div>
            <div className="pm-lw-act__sub">{p.top_exchange}</div>
          </div>
        ))}
      </div>
      {quotes.length > 0 && (
        <>
          <div className="pm-lw-stats__section">Top quote currencies</div>
          <div className="pm-lw-stats__quotes">
            {quotes.map((q) => (
              <span key={q.quote} className="pm-lw-quote">{q.quote} · {q.count}</span>
            ))}
          </div>
        </>
      )}
      {stats?.global_stats?.last_updated && (
        <div className="pm-lw-footer">updated {new Date(stats.global_stats.last_updated).toLocaleString()}</div>
      )}
    </div>
  );
}
