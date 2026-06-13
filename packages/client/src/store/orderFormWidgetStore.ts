import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderType, TimeInForce } from '../types/orders';

/**
 * Persisted per-widget settings for the Place Order (OrderForm) widget. Kept
 * SEPARATE from placeOrderStore, which holds transient runtime/form state that
 * must NOT survive a reload. This store mirrors the persisted-settings pattern
 * used by userTradingDataWidgetStore.
 */
export interface OrderFormWidgetSettings {
  /** Order type the form opens on. */
  defaultOrderType: OrderType;
  /** Default time-in-force applied to new orders. */
  defaultTimeInForce: TimeInForce;
  /** Show a confirmation step before an order is submitted. */
  confirmBeforeSubmit: boolean;
  /** Default post-only (maker-only) flag for limit orders. */
  postOnly: boolean;
  /** Default reduce-only flag (futures). */
  reduceOnly: boolean;
}

interface OrderFormWidgetState {
  widgetId: string;
  settings: OrderFormWidgetSettings;
}

interface OrderFormWidgetStore {
  widgets: Map<string, OrderFormWidgetState>;
  getWidget: (widgetId: string) => OrderFormWidgetState;
  updateSettings: (widgetId: string, updates: Partial<OrderFormWidgetSettings>) => void;
}

const defaultSettings: OrderFormWidgetSettings = {
  defaultOrderType: 'market',
  defaultTimeInForce: 'GTC',
  confirmBeforeSubmit: false,
  postOnly: false,
  reduceOnly: false,
};

const defaultWidgetState = (widgetId: string): OrderFormWidgetState => ({
  widgetId,
  settings: { ...defaultSettings },
});

export const useOrderFormWidgetStore = create<OrderFormWidgetStore>()(
  persist(
    (set, get) => ({
      widgets: new Map(),

      getWidget: (widgetId: string) => {
        const widget = get().widgets.get(widgetId);
        if (!widget) {
          const newWidget = defaultWidgetState(widgetId);
          set((state) => ({
            widgets: new Map(state.widgets).set(widgetId, newWidget),
          }));
          return newWidget;
        }
        return widget;
      },

      updateSettings: (widgetId: string, updates: Partial<OrderFormWidgetSettings>) => {
        set((state) => {
          const newWidgets = new Map(state.widgets);
          const existing = newWidgets.get(widgetId) || defaultWidgetState(widgetId);
          newWidgets.set(widgetId, {
            ...existing,
            settings: { ...existing.settings, ...updates },
          });
          return { widgets: newWidgets };
        });
      },
    }),
    {
      name: 'order-form-widget-store',
      partialize: (state) => ({
        widgets: Array.from(state.widgets.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.widgets)) {
          state.widgets = new Map(state.widgets);
        }
      },
    }
  )
);
