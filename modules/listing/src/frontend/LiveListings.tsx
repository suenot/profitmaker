import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { ModuleListing, RouteStatus } from '../shared/types';
import { defaultLiveConfig, formatTime, passFilters, playBeep, restoreIfMinimized, type DashboardStoreShape } from './lib';
import { errorMessage, subscribeListingStream } from './streamClient';

const MAX_ROWS = 100;
/** One banner text for every balance-exhausted surface (upstream 402, relayed 'billing' state). */
const BILLING_BANNER = 'MM balance exhausted — top up at auth.marketmaker.cc';
const STATUS_LABEL: Record<RouteStatus, string> = {
  connecting: 'connecting…', up: 'live', reconnecting: 'reconnecting…', polling: 'polling',
  // Displayed only if a 'billing' state ever reaches the badge; the widget
  // normally surfaces it as BILLING_BANNER instead and keeps the badge as-is.
  billing: 'no balance', inactive: 'no key',
};

/**
 * Merge older backfill rows under the live ones, deduped by id, capped: rows
 * that already streamed in are provably fresher than any replayed snapshot.
 */
const mergeBackfill = (prev: ModuleListing[], incoming: ModuleListing[]): ModuleListing[] =>
  prev.length
    ? [...prev, ...incoming.filter((b) => !prev.some((p) => p.id === b.id))].slice(0, MAX_ROWS)
    : incoming.slice(0, MAX_ROWS);

export function LiveListingsWidget({ widgetId, config }: WidgetProps) {
  const terminal = getTerminal();
  const [listings, setListings] = React.useState<ModuleListing[]>([]);
  const [status, setStatus] = React.useState<RouteStatus>('connecting');
  const [banner, setBanner] = React.useState<string | null>(null);
  const cfg = React.useMemo(
    () => ({ ...defaultLiveConfig(), ...(config as Partial<ReturnType<typeof defaultLiveConfig>>) }),
    // Stable while the persisted config object is unchanged: nested arrays keep
    // their references, so the stream effect below does not resubscribe every render.
    [config],
  );

  // Backfill + current status on mount.
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/listings/recent?limit=50');
        if (!alive) return;
        if (res.status === 402) setBanner(BILLING_BANNER);
        else if (!res.ok) setBanner(await errorMessage(res)); // the server's own words, e.g. the bridge gap
        else {
          setBanner(null);
          const data = (await res.json()) as { listings: ModuleListing[] };
          // Stream rows that arrived while the backfill was in flight are fresher
          // than this server-side snapshot — merge-dedupe instead of replacing,
          // keeping the live rows on top (backfill survivors are provably older).
          setListings((prev) => mergeBackfill(prev, data.listings));
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

  // Live pushes over the per-user /stream SSE (the module's socket namespace is gone).
  React.useEffect(() => {
    const sub = subscribeListingStream({
      url: '/api/modules/listing/stream',
      fetchImpl: (path, init) => terminal.api.fetch(path, init),
      onListing(listing) {
        if (!passFilters(listing, cfg)) return;
        setListings((prev) => [listing, ...prev].slice(0, MAX_ROWS));
        setBanner(null);
        setStatus('up'); // a delivered listing proves the stream is live
        if (cfg.toast) terminal.notify.info(`Listing: ${listing.symbol} on ${listing.exchange}`);
        if (cfg.sound) playBeep();
        if (cfg.autoRestore) {
          const store = terminal.stores.useDashboardStore as unknown as DashboardStoreShape & { getState(): DashboardStoreShape };
          restoreIfMinimized(store.getState(), widgetId);
        }
      },
      // Ring replay (reconnect, reload, second tab): merge like the mount
      // backfill, NEVER through the alert pipeline — these events already
      // toasted/beeped on the connection that first saw them.
      onBackfill(listing) {
        setListings((prev) => mergeBackfill(prev, [listing]));
      },
      onStatus(state) {
        if (state === 'billing') {
          // Upstream 402 relayed as a state, not an HTTP error: the connection
          // stays open and the server retries on its own cadence — banner only.
          setBanner(BILLING_BANNER);
          return;
        }
        if (state === 'up') setBanner(null); // recovered: any transient banner is stale
        // 'expired' means the server tore the stream down for a re-acquire —
        // the client reconnects, so show that on the badge instead.
        setStatus(state === 'expired' ? 'reconnecting' : state);
      },
      onError(err) {
        if (err.status === 401) setBanner('sign in required');
        else if (err.status === 402) setBanner(BILLING_BANNER);
        else if (err.status === 403) setBanner('listingapis subscription required at auth.marketmaker.cc');
        // The parsed body's error field — e.g. the real "terminal auth bridge
        // not configured" instead of a generic busy guess. Status 0 is a
        // network failure whose exception text helps nobody.
        else if (err.status > 0 && err.message) setBanner(err.message);
        else setBanner('connection error');
        // 401/403 never reconnect — leave the badge alone; the banner says why.
        if (err.status !== 401 && err.status !== 403) setStatus('reconnecting');
      },
    });
    return () => sub.close();
  }, [widgetId, terminal, cfg.exchanges, cfg.types, cfg.sound, cfg.toast, cfg.autoRestore]);

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
