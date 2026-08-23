import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetSettingsProps } from '@profitmaker/module-sdk';
import { defaultLiveConfig, type DashboardStoreShape } from './lib';

/** Referentially stable fallback so the selector never returns a fresh object (zustand v5 snapshot safety). */
const EMPTY_CONFIG: Record<string, unknown> = {};

export function LiveListingsSettings({ widgetId }: WidgetSettingsProps) {
  const terminal = getTerminal();
  const useDashboardStore = terminal.stores.useDashboardStore as unknown as {
    (s: (st: { dashboards: Array<{ widgets: Array<{ id: string; config?: Record<string, unknown> }> }> }) => unknown): unknown;
    getState(): DashboardStoreShape & { updateWidgetConfig: (id: string, patch: Record<string, unknown>) => void };
  };
  // Select the widget's raw config reference (stable between store writes —
  // the host store is immer-backed). Merging defaults inside the selector
  // would return a fresh object on every snapshot read and loop
  // useSyncExternalStore, so the merge happens outside the store hook.
  const stored = useDashboardStore((s) => {
    for (const d of s.dashboards) {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (w) return w.config ?? EMPTY_CONFIG;
    }
    return undefined;
  }) as Record<string, unknown> | undefined;
  const cfg = { ...defaultLiveConfig(), ...(stored ?? {}) };
  const [exchanges, setExchanges] = React.useState<string[]>([]);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/exchanges');
        if (res.ok) setExchanges(((await res.json()) as { exchanges: string[] }).exchanges);
      } catch { /* optional list */ }
    })();
  }, [terminal]);

  const set = (patch: Record<string, unknown>) => useDashboardStore.getState().updateWidgetConfig(widgetId, patch);
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="pm-lw-settings">
      <div className="pm-lw-settings__section">Alerts</div>
      {(['sound', 'toast', 'autoRestore'] as const).map((key) => (
        <label key={key} className="pm-lw-settings__row">
          <input type="checkbox" checked={cfg[key]} onChange={(e) => set({ [key]: e.target.checked })} />
          {{ sound: 'Sound', toast: 'Toast notification', autoRestore: 'Auto-restore widget' }[key]}
        </label>
      ))}
      <div className="pm-lw-settings__section">Types</div>
      {(['listing', 'new-pair'] as const).map((t) => (
        <label key={t} className="pm-lw-settings__row">
          <input
            type="checkbox"
            checked={cfg.types.includes(t)}
            onChange={(e) => set({ types: e.target.checked ? [...cfg.types, t] : cfg.types.filter((x) => x !== t) })}
          />
          {t === 'listing' ? 'Listings' : 'New pairs'}
        </label>
      ))}
      <div className="pm-lw-settings__section">Exchanges (empty = all)</div>
      {exchanges.length === 0 && <div className="pm-lw-settings__hint">exchange list unavailable (module not configured?)</div>}
      {exchanges.map((ex) => (
        <label key={ex} className="pm-lw-settings__row">
          <input
            type="checkbox"
            checked={cfg.exchanges.includes(ex)}
            onChange={() => set({ exchanges: toggleIn(cfg.exchanges, ex) })}
          />
          {ex}
        </label>
      ))}
    </div>
  );
}
