import React from 'react';
import './style.css';
import { defineModule, getTerminal } from '@profitmaker/module-sdk';
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
 * The host data-access hooks live on `getTerminal().hooks`. They are real React
 * hooks, so call them unconditionally at the top of the component.
 */

/** Render the group's ticker plus the backend heartbeat counter. */
function ExampleWidget({ widgetId, groupId, config, updateConfig }: WidgetProps) {
  const terminal = getTerminal();
  const group = terminal.hooks.useWidgetGroup(groupId);

  // Subscribe to the group's ticker for the lifetime of this component.
  const { ticker } = terminal.hooks.useMarketData({
    exchange: group.exchange ?? '',
    symbol: group.symbol ?? '',
    dataType: 'ticker',
    market: group.market,
    subscriberId: widgetId,
  });

  // Live heartbeat pushed by the backend over the module's socket namespace.
  const socket = terminal.hooks.useModuleSocket('example');
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

/** Settings panel: edit the widget label, persisted via updateConfig. */
function ExampleSettings({ widgetId }: WidgetSettingsProps) {
  const terminal = getTerminal();
  // Settings panels receive only the widget id; read/write config through the
  // host store. For the template we keep a local input and persist on change.
  const store = terminal.stores.useDashboardStore as unknown as () => {
    updateWidgetConfig?: (id: string, patch: Record<string, unknown>) => void;
  };
  const dashboard = typeof store === 'function' ? store() : undefined;

  return (
    <div style={{ padding: 12 }}>
      <label style={{ display: 'block', marginBottom: 4 }}>Label</label>
      <input
        type="text"
        placeholder="Example"
        onChange={(e) =>
          dashboard?.updateWidgetConfig?.(widgetId, { label: e.target.value })
        }
        style={{ width: '100%' }}
      />
    </div>
  );
}

const helloWidget: WidgetDefinition = {
  type: 'example.hello',
  title: 'Example Hello',
  icon: 'puzzle',
  category: 'modules',
  defaultSize: { width: 4, height: 3 },
  Component: ExampleWidget,
  Settings: ExampleSettings,
};

export default defineModule({
  id: 'example',
  widgets: [helloWidget],
});
