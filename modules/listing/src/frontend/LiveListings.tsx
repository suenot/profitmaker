import React from 'react';
import { getTerminal, useModuleSocket } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { ModuleListing, RouteStatus } from '../shared/types';
import { defaultLiveConfig, formatTime, passFilters, playBeep, restoreIfMinimized, type DashboardStoreShape } from './lib';

const MAX_ROWS = 100;
const STATUS_LABEL: Record<RouteStatus, string> = {
  connecting: 'connecting…', up: 'live', reconnecting: 'reconnecting…', polling: 'polling', inactive: 'no key',
};

export function LiveListingsWidget({ widgetId, config }: WidgetProps) {
  const terminal = getTerminal();
  const socket = useModuleSocket('listing');
  const [listings, setListings] = React.useState<ModuleListing[]>([]);
  const [status, setStatus] = React.useState<RouteStatus>('connecting');
  const [banner, setBanner] = React.useState<string | null>(null);
  const cfg = React.useMemo(
    () => ({ ...defaultLiveConfig(), ...(config as Partial<ReturnType<typeof defaultLiveConfig>>) }),
    // Stable while the persisted config object is unchanged: nested arrays keep
    // their references, so the socket effect below does not resubscribe every render.
    [config],
  );

  // Backfill + current status on mount.
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/listings/recent?limit=50');
        if (!alive) return;
        if (res.status === 402) setBanner('MM balance exhausted — top up at auth.marketmaker.cc');
        else if (res.status === 503) setBanner('LISTINGAPIS_API_KEY is not configured on the server');
        else if (!res.ok) setBanner('ListingAPIs unavailable');
        else {
          setBanner(null);
          const data = (await res.json()) as { listings: ModuleListing[] };
          // Socket rows that arrived while the backfill was in flight are fresher
          // than this server-side snapshot — merge-dedupe instead of replacing,
          // keeping the live rows on top (backfill survivors are provably older).
          setListings((prev) => prev.length
            ? [...prev, ...data.listings.filter((b) => !prev.some((p) => p.id === b.id))].slice(0, MAX_ROWS)
            : data.listings.slice(0, MAX_ROWS));
        }
      } catch { if (alive) setBanner('connection error'); }
      // /status is fetched even when the backfill errored: an early return on
      // 402/503 would leave the badge stuck on "connecting…" forever.
      try {
        const st = await terminal.api.fetch('/api/modules/listing/status');
        if (alive && st.ok) setStatus(((await st.json()) as { status: RouteStatus }).status);
      } catch { /* status is best-effort */ }
    })();
    return () => { alive = false; };
  }, [terminal]);

  // Live pushes.
  React.useEffect(() => {
    if (!socket) return;
    const onListing = (raw: unknown) => {
      const listing = raw as ModuleListing;
      if (!passFilters(listing, cfg)) return;
      setListings((prev) => [listing, ...prev].slice(0, MAX_ROWS));
      setBanner(null);
      if (cfg.toast) terminal.notify.info(`Listing: ${listing.symbol} on ${listing.exchange}`);
      if (cfg.sound) playBeep();
      if (cfg.autoRestore) {
        const store = terminal.stores.useDashboardStore as unknown as DashboardStoreShape & { getState(): DashboardStoreShape };
        restoreIfMinimized(store.getState(), widgetId);
      }
    };
    const onStatus = (raw: unknown) => setStatus(raw as RouteStatus);
    socket.on('listing', onListing);
    socket.on('status', onStatus);
    return () => { socket.off('listing', onListing); socket.off('status', onStatus); };
  }, [socket, widgetId, terminal, cfg.exchanges, cfg.types, cfg.sound, cfg.toast, cfg.autoRestore]);

  // Pushes are already filtered; backfill rows also pass through the filter at render time.
  const rows = listings.filter((l) => passFilters(l, cfg));

  return (
    <div className="pm-lw-live">
      <div className="pm-lw-live__bar">
        <span className={`pm-lw-badge pm-lw-badge--${status === 'up' ? 'up' : 'warn'}`}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      {banner && <div className="pm-lw-banner">{banner}</div>}
      {rows.length === 0 && !banner && (
        <div className="pm-lw-empty">waiting for new listings…</div>
      )}
      <div className="pm-lw-live__rows">
        {rows.map((l) => (
          <div key={l.id} className={`pm-lw-row pm-lw-row--${l.type}`}>
            <span className="pm-lw-row__time">{formatTime(l.detectedAt ?? l.listedAt)}</span>
            <span className="pm-lw-row__ex">{l.exchange}</span>
            <span className="pm-lw-row__sym" title={l.fullName}>{l.symbol}</span>
            <span className="pm-lw-row__type">{l.type === 'new-pair' ? 'pair' : 'listing'}</span>
            {l.url && (
              <a className="pm-lw-row__link" href={l.url} target="_blank" rel="noreferrer">↗</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
