import { create } from 'zustand';
import type { WidgetLookOverride } from '@/hooks/useWidgetLook';

interface OrderBookWidgetState {
  exchange: string;
  symbol: string;
  market: string;
  displayDepth: number;
  showCumulative: boolean;
  priceDecimals: number;
  amountDecimals: number;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  /** This widget's own look; unset values follow the active preset. */
  look?: WidgetLookOverride;
}

interface OrderBookWidgetsStore {
  widgets: Record<string, OrderBookWidgetState>;
  getWidget: (widgetId: string) => OrderBookWidgetState;
  updateWidget: (widgetId: string, updates: Partial<OrderBookWidgetState>) => void;
  removeWidget: (widgetId: string) => void;
  setWidgetSettings: (widgetId: string, settings: {
    exchange: string;
    symbol: string;
    market: string;
    displayDepth: number;
    showCumulative: boolean;
    priceDecimals: number;
    amountDecimals: number;
  }) => void;
}

const defaultOrderBookState: OrderBookWidgetState = {
  exchange: 'binance',
  symbol: 'BTC/USDT',
  market: 'spot',
  displayDepth: 10,
  showCumulative: true,
  priceDecimals: 2,
  amountDecimals: 4,
  isSubscribed: false,
  isLoading: false,
  error: null,
};

export const useOrderBookWidgetsStore = create<OrderBookWidgetsStore>((set, get) => ({
  widgets: {},
  
  getWidget: (widgetId: string) => {
    const { widgets } = get();
    return widgets[widgetId] || { ...defaultOrderBookState };
  },
  
  updateWidget: (widgetId: string, updates: Partial<OrderBookWidgetState>) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [widgetId]: {
          ...state.widgets[widgetId] || defaultOrderBookState,
          ...updates
        }
      }
    }));
  },
  
  removeWidget: (widgetId: string) => {
    set((state) => {
      const { [widgetId]: removed, ...rest } = state.widgets;
      return { widgets: rest };
    });
  },
  
  setWidgetSettings: (widgetId: string, settings) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [widgetId]: {
          ...state.widgets[widgetId] || defaultOrderBookState,
          ...settings
        }
      }
    }));
  }
})); 