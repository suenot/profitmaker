import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TradingDataTab = 'trades' | 'positions' | 'orders';

export interface UserTradingDataWidgetSettings {
  activeTab: TradingDataTab;
  selectedAccountId: string | 'all'; // ID конкретного аккаунта или 'all' для всех
  showZeroPositions: boolean;
  showClosedOrders: boolean;
  tradesLimit: number;
}

interface UserTradingDataWidgetState {
  widgetId: string;
  settings: UserTradingDataWidgetSettings;
}

// Transient (non-persisted) registry of per-widget refresh handlers. The widget
// owns the tab refs and registers a refresh callback under its widgetId; the
// header refresh button (rendered in a separate component tree) triggers it.
// Kept off the persisted slice via `partialize` below.
type RefreshHandler = () => void | Promise<void>;

interface UserTradingDataWidgetStore {
  widgets: Map<string, UserTradingDataWidgetState>;
  refreshHandlers: Map<string, RefreshHandler>;
  getWidget: (widgetId: string) => UserTradingDataWidgetState;
  updateWidget: (widgetId: string, updates: Partial<UserTradingDataWidgetSettings>) => void;
  setWidgetSettings: (widgetId: string, settings: Partial<UserTradingDataWidgetSettings>) => void;
  registerRefreshHandler: (widgetId: string, handler: RefreshHandler) => void;
  unregisterRefreshHandler: (widgetId: string) => void;
  triggerRefresh: (widgetId: string) => void | Promise<void>;
}

const defaultSettings: UserTradingDataWidgetSettings = {
  activeTab: 'trades',
  selectedAccountId: 'all', // 'all' = все аккаунты
  showZeroPositions: false,
  showClosedOrders: false,
  tradesLimit: 100,
};

const defaultWidgetState = (widgetId: string): UserTradingDataWidgetState => ({
  widgetId,
  settings: { ...defaultSettings }
});

export const useUserTradingDataWidgetStore = create<UserTradingDataWidgetStore>()(
  persist(
    (set, get) => ({
      widgets: new Map(),
      refreshHandlers: new Map(),

      getWidget: (widgetId: string) => {
        const widget = get().widgets.get(widgetId);
        if (!widget) {
          const newWidget = defaultWidgetState(widgetId);
          set(state => ({
            widgets: new Map(state.widgets).set(widgetId, newWidget)
          }));
          return newWidget;
        }
        return widget;
      },
      
      updateWidget: (widgetId: string, updates: Partial<UserTradingDataWidgetSettings>) => {
        set(state => {
          const newWidgets = new Map(state.widgets);
          const existingWidget = newWidgets.get(widgetId) || defaultWidgetState(widgetId);
          
          newWidgets.set(widgetId, {
            ...existingWidget,
            settings: {
              ...existingWidget.settings,
              ...updates
            }
          });
          
          return { widgets: newWidgets };
        });
      },
      
      setWidgetSettings: (widgetId: string, settings: Partial<UserTradingDataWidgetSettings>) => {
        get().updateWidget(widgetId, settings);
      },

      registerRefreshHandler: (widgetId: string, handler: RefreshHandler) => {
        // Mutating the same Map keeps this off React's render path; refresh
        // handlers are looked up imperatively on button click, not subscribed to.
        get().refreshHandlers.set(widgetId, handler);
      },

      unregisterRefreshHandler: (widgetId: string) => {
        get().refreshHandlers.delete(widgetId);
      },

      triggerRefresh: (widgetId: string) => {
        const handler = get().refreshHandlers.get(widgetId);
        return handler ? handler() : undefined;
      }
    }),
    {
      name: 'user-trading-data-widget-store',
      partialize: (state) => ({
        widgets: Array.from(state.widgets.entries())
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.widgets)) {
          state.widgets = new Map(state.widgets);
        }
      }
    }
  )
); 