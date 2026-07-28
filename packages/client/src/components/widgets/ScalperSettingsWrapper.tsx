import React from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { PANE_LABELS, PANE_ORDER_DEFAULT, defaultLayout, type PaneId } from './scalper/panelLayout';
import { useScalperWidgetsStore, type BottomSectionId } from '../../store/scalperWidgetStore';

/**
 * Settings for the Scalper widget: what is shown and how the two aggregations
 * are cut. Everything here writes to the same per-widget store the widget reads,
 * so the header chips and these switches are two views of one state.
 */

const BOTTOM_LABELS: Record<BottomSectionId, string> = {
  position: 'Position',
  order: 'Order entry',
  pnl: 'P&L',
};

const CLUSTER_TIMEFRAMES: { value: number; label: string }[] = [
  { value: 1_000, label: '1s' },
  { value: 5_000, label: '5s' },
  { value: 15_000, label: '15s' },
  { value: 30_000, label: '30s' },
  { value: 60_000, label: '1m' },
];

const TICKS_PER_CANDLE = [10, 25, 50, 100];

const ScalperSettingsWrapper: React.FC<{ widgetId: string; selectedGroupId?: string }> = ({ widgetId }) => {
  const settings = useScalperWidgetsStore(s => s.getWidget(widgetId));
  const updateWidget = useScalperWidgetsStore(s => s.updateWidget);
  const togglePane = useScalperWidgetsStore(s => s.togglePane);
  const toggleBottomSection = useScalperWidgetsStore(s => s.toggleBottomSection);

  const paneRow = (id: PaneId, index: number) => (
    <div key={id} className="flex items-center justify-between py-1">
      <Label htmlFor={`scalper-pane-${id}`} className="text-terminal-text">
        {PANE_LABELS[id]}
        <span className="text-terminal-muted ml-2 text-xs">Ctrl+{index + 1}</span>
      </Label>
      <Switch
        id={`scalper-pane-${id}`}
        checked={settings.layout.visible[id]}
        onCheckedChange={() => togglePane(widgetId, id)}
      />
    </div>
  );

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="text-terminal-text font-medium mb-1">Panes</h4>
        <p className="text-terminal-muted text-xs mb-2">
          All panes share one price axis. Reorder them by dragging their chip in the widget header.
        </p>
        {PANE_ORDER_DEFAULT.map(paneRow)}
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-terminal-text font-medium">Bottom bar</h4>
          <Switch
            checked={settings.showBottomBar}
            onCheckedChange={value => updateWidget(widgetId, { showBottomBar: value })}
          />
        </div>
        <div className={settings.showBottomBar ? '' : 'opacity-50 pointer-events-none'}>
          {(Object.keys(BOTTOM_LABELS) as BottomSectionId[]).map(id => (
            <div key={id} className="flex items-center justify-between py-1">
              <Label htmlFor={`scalper-bottom-${id}`} className="text-terminal-text">
                {BOTTOM_LABELS[id]}
              </Label>
              <Switch
                id={`scalper-bottom-${id}`}
                checked={settings.bottomVisible[id]}
                onCheckedChange={() => toggleBottomSection(widgetId, id)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="scalper-header" className="text-terminal-text">
          Header strip
        </Label>
        <Switch
          id="scalper-header"
          checked={settings.showHeader}
          onCheckedChange={value => updateWidget(widgetId, { showHeader: value })}
        />
      </div>

      <Separator />

      <div>
        <h4 className="text-terminal-text font-medium mb-2">Aggregation</h4>

        <div className="flex items-center justify-between gap-2 py-1">
          <Label className="text-terminal-text">Cluster candle</Label>
          <Select
            value={String(settings.clusterTimeframe)}
            onValueChange={value => updateWidget(widgetId, { clusterTimeframe: Number(value) })}
          >
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLUSTER_TIMEFRAMES.map(tf => (
                <SelectItem key={tf.value} value={String(tf.value)}>{tf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2 py-1">
          <Label className="text-terminal-text">Prints per tick candle</Label>
          <Select
            value={String(settings.ticksPerCandle)}
            onValueChange={value => updateWidget(widgetId, { ticksPerCandle: Number(value) })}
          >
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TICKS_PER_CANDLE.map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2 py-1">
          <Label htmlFor="scalper-volume-filter" className="text-terminal-text">Tape volume filter</Label>
          <Input
            id="scalper-volume-filter"
            value={settings.volumeFilter || ''}
            onChange={e => updateWidget(widgetId, { volumeFilter: Number(e.target.value) || 0 })}
            placeholder="0"
            inputMode="decimal"
            className="w-24"
          />
        </div>

        <div className="flex items-center justify-between gap-2 py-1">
          <Label htmlFor="scalper-quantity" className="text-terminal-text">Order size</Label>
          <Input
            id="scalper-quantity"
            value={settings.quantity}
            onChange={e => updateWidget(widgetId, { quantity: e.target.value })}
            inputMode="decimal"
            className="w-24"
          />
        </div>
      </div>

      <Separator />

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          updateWidget(widgetId, {
            layout: defaultLayout(),
            showBottomBar: true,
            bottomVisible: { position: true, order: true, pnl: true },
            showHeader: true,
          })
        }
      >
        Reset layout
      </Button>

      <p className="text-terminal-muted text-xs">
        Wheel pans the price axis, Shift+wheel zooms, Ctrl+wheel changes grouping. In the widget:
        r cycles follow mode, Shift re-centres, t/y buy/sell at market, d flattens, Space cancels
        every order, Escape does both.
      </p>
    </div>
  );
};

export default ScalperSettingsWrapper;
