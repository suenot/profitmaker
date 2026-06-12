import React from 'react';
import './style.css';
import {
  defineModule,
  getTerminal,
  useWidgetGroup,
  useMarketData,
  useModuleSocket,
} from '@profitmaker/module-sdk';
import type {
  WidgetProps,
  WidgetSettingsProps,
  WidgetDefinition,
} from '@profitmaker/module-sdk';

/**
 * Example widget frontend.
 *
 * Built with the SDK vite preset (@profitmaker/module-sdk/vite): `react`,
 * `react-dom`, `zustand` and the SDK itself are aliased to runtime shims that
 * pull the host's singletons off window.__PROFITMAKER__, so there is exactly
 * one React instance and the host hooks just work.
 *
 * The SDK re-exports the host data-access hooks (`useWidgetGroup`,
 * `useMarketData`, `useModuleSocket`) — import them directly. They are real
 * React hooks, so call them unconditionally at the top of the component.
 */

/** Render the group's ticker plus the backend heartbeat counter. */
function ExampleWidget({ widgetId, groupId, config, updateConfig }: WidgetProps) {
  const group = useWidgetGroup(groupId);

  // Subscribe to the group's ticker for the lifetime of this component.
  const { ticker } = useMarketData({
    exchange: group.exchange ?? '',
    symbol: group.symbol ?? '',
    dataType: 'ticker',
    market: group.market,
    subscriberId: widgetId,
  });

  // Live heartbeat pushed by the backend over the module's socket namespace.
  const socket = useModuleSocket('example');
  const [heartbeat, setHeartbeat] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!socket) return;
    const onBeat = (...args: unknown[]) => setHeartbeat(args[0] as number);
    socket.on('heartbeat', onBeat);
    return () => {
      socket.off('heartbeat', onBeat);
    };
  }, [socket]);

  const label = (config.label as string) || 'Example';

  if (!group.isComplete) {
    return (
      <div style={{ padding: 12 }}>
        Select an exchange and symbol for this widget's group to see data.
      </div>
    );
  }

  return (
    <div className="pm-example-widget">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div>
        {group.exchange} · {group.symbol}
      </div>
      <div className="pm-example-widget__price">
        {ticker?.last != null ? ticker.last : '—'}
      </div>
      <div className="pm-example-widget__hint">
        backend heartbeat: {heartbeat ?? '—'}
      </div>
    </div>
  );
}

/**
 * Settings panel: edit the widget label, persisted to the widget's `config`.
 *
 * Settings panels receive only the widget id, so we use the host dashboard
 * store's `updateWidgetConfig(widgetId, patch)` convenience (it locates the
 * widget across dashboards) — the same `config` the widget reads via its
 * `config` prop. Selecting from the store keeps the input in sync.
 */
function ExampleSettings({ widgetId }: WidgetSettingsProps) {
  const terminal = getTerminal();
  const useDashboardStore = terminal.stores.useDashboardStore as unknown as {
    (selector: (s: DashboardStoreShape) => unknown): unknown;
    getState: () => DashboardStoreShape;
  };

  // Reactive read of the current label from the widget's config.
  const label = useDashboardStore((s) => {
    for (const d of s.dashboards) {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (w) return (w.config?.label as string) ?? '';
    }
    return '';
  }) as string;

  return (
    <div style={{ padding: 12 }}>
      <label style={{ display: 'block', marginBottom: 4 }}>Label</label>
      <input
        type="text"
        value={label}
        placeholder="Example"
        onChange={(e) =>
          useDashboardStore.getState().updateWidgetConfig(widgetId, { label: e.target.value })
        }
        style={{ width: '100%' }}
      />
    </div>
  );
}

/** Minimal structural view of the host dashboard store used by the settings panel. */
interface DashboardStoreShape {
  dashboards: Array<{ widgets: Array<{ id: string; config?: Record<string, unknown> }> }>;
  updateWidgetConfig: (widgetId: string, patch: Record<string, unknown>) => void;
}

const helloWidget: WidgetDefinition = {
  type: 'example.hello',
  title: 'Example Hello',
  icon: 'Puzzle',
  category: 'modules',
  defaultSize: { width: 360, height: 220 },
  Component: ExampleWidget,
  Settings: ExampleSettings,
};

export default defineModule({
  id: 'example',
  widgets: [helloWidget],
});
