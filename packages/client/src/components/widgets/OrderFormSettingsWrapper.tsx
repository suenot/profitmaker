import React, { useCallback } from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useOrderFormWidgetStore } from '../../store/orderFormWidgetStore';
import type { OrderType, TimeInForce } from '../../types/orders';

interface OrderFormSettingsWrapperProps {
  widgetId: string;
  selectedGroupId?: string;
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop_loss: 'Stop',
  take_profit: 'Take Profit',
  stop_limit: 'Stop Limit',
  trailing_stop: 'Trailing Stop',
};

const TIF_OPTIONS: TimeInForce[] = ['GTC', 'IOC', 'FOK', 'DAY'];

/**
 * Real settings panel for the Place Order widget (replaces the old
 * "coming soon" placeholder). Reads/writes the persisted per-widget settings
 * in orderFormWidgetStore.
 */
const OrderFormSettingsWrapper: React.FC<OrderFormSettingsWrapperProps> = ({ widgetId }) => {
  const { getWidget, updateSettings } = useOrderFormWidgetStore();
  const { settings } = getWidget(widgetId);

  const handleDefaultTypeChange = useCallback((value: string) => {
    updateSettings(widgetId, { defaultOrderType: value as OrderType });
  }, [widgetId, updateSettings]);

  const handleTifChange = useCallback((value: string) => {
    updateSettings(widgetId, { defaultTimeInForce: value as TimeInForce });
  }, [widgetId, updateSettings]);

  const handleConfirmChange = useCallback((checked: boolean) => {
    updateSettings(widgetId, { confirmBeforeSubmit: checked });
  }, [widgetId, updateSettings]);

  const handlePostOnlyChange = useCallback((checked: boolean) => {
    updateSettings(widgetId, { postOnly: checked });
  }, [widgetId, updateSettings]);

  const handleReduceOnlyChange = useCallback((checked: boolean) => {
    updateSettings(widgetId, { reduceOnly: checked });
  }, [widgetId, updateSettings]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Order Defaults</h3>

        {/* Default order type */}
        <div className="space-y-2">
          <Label className="text-sm text-terminal-text">Default Order Type</Label>
          <p className="text-xs text-terminal-muted">Order type the form opens on</p>
          <Select value={settings.defaultOrderType} onValueChange={handleDefaultTypeChange}>
            <SelectTrigger className="w-full h-8 bg-terminal-bg border-terminal-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-terminal-widget border-terminal-border">
              {(['market', 'limit', 'stop_loss'] as OrderType[]).map((t) => (
                <SelectItem key={t} value={t}>{ORDER_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Default time-in-force */}
        <div className="space-y-2">
          <Label className="text-sm text-terminal-text">Time In Force</Label>
          <p className="text-xs text-terminal-muted">Applied to new orders by default</p>
          <Select value={settings.defaultTimeInForce} onValueChange={handleTifChange}>
            <SelectTrigger className="w-full h-8 bg-terminal-bg border-terminal-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-terminal-widget border-terminal-border">
              {TIF_OPTIONS.map((tif) => (
                <SelectItem key={tif} value={tif}>{tif}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Execution</h3>

        {/* Confirm before submit */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Confirm Before Submit</Label>
            <p className="text-xs text-terminal-muted">Ask for confirmation before placing an order</p>
          </div>
          <Switch checked={settings.confirmBeforeSubmit} onCheckedChange={handleConfirmChange} />
        </div>

        {/* Post only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Post Only</Label>
            <p className="text-xs text-terminal-muted">Maker-only by default for limit orders</p>
          </div>
          <Switch checked={settings.postOnly} onCheckedChange={handlePostOnlyChange} />
        </div>

        {/* Reduce only */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Reduce Only</Label>
            <p className="text-xs text-terminal-muted">Only reduce an open position (futures)</p>
          </div>
          <Switch checked={settings.reduceOnly} onCheckedChange={handleReduceOnlyChange} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-terminal-text">Current Settings</h3>
        <div className="text-xs text-terminal-muted space-y-1">
          <p>Default Type: <span className="text-terminal-text">{ORDER_TYPE_LABELS[settings.defaultOrderType]}</span></p>
          <p>Time In Force: <span className="text-terminal-text">{settings.defaultTimeInForce}</span></p>
          <p>Confirm Before Submit: <span className="text-terminal-text">{settings.confirmBeforeSubmit ? 'Yes' : 'No'}</span></p>
          <p>Post Only: <span className="text-terminal-text">{settings.postOnly ? 'Yes' : 'No'}</span></p>
          <p>Reduce Only: <span className="text-terminal-text">{settings.reduceOnly ? 'Yes' : 'No'}</span></p>
        </div>
      </div>
    </div>
  );
};

export default OrderFormSettingsWrapper;
