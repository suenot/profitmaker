import { create } from 'zustand';
import { MarketType } from '@/types/dataProviders';

interface TradesWidgetState {
  isAggregatedTrades: boolean;
  tradesLimit: number;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  showTableHeader: boolean;
  showStats: boolean;
  /**
   * Quote-currency value at or above which a print counts as "large". In quote
   * terms rather than base, so one threshold reads the same on BTC and on a
   * meme coin — what a scalper watches for is size in money, not in units.
   */
  largeTradeValue: number;
  /** Emphasize large prints in the tape. */
  highlightLarge: boolean;
  /** Short blip when a large print arrives (off by default). */
  soundOnLarge: boolean;
  /** Merge consecutive prints at the same price and side into one row. */
  mergeSamePrice: boolean;
}

interface TradesWidgetsStore {
  widgets: Record<string, TradesWidgetState>;
  getWidget: (widgetId: string) => TradesWidgetState;
  updateWidget: (widgetId: string, updates: Partial<TradesWidgetState>) => void;
  removeWidget: (widgetId: string) => void;
}

const defaultTradesState: TradesWidgetState = {
  isAggregatedTrades: true, // По умолчанию используем агрегированные трейды
  tradesLimit: 500,         // По умолчанию 500 трейдов
  isSubscribed: false,
  isLoading: false,
  error: null,
  showTableHeader: false,   // По умолчанию заголовки выключены
  showStats: false,         // По умолчанию статистика выключена
  largeTradeValue: 50000,   // $50k — a size worth looking up from the chart
  highlightLarge: true,
  soundOnLarge: false,
  mergeSamePrice: false,
};

export const useTradesWidgetsStore = create<TradesWidgetsStore>((set, get) => ({
  widgets: {},
  
  getWidget: (widgetId: string) => {
    const { widgets } = get();
    return widgets[widgetId] || { ...defaultTradesState };
  },
  
  updateWidget: (widgetId: string, updates: Partial<TradesWidgetState>) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [widgetId]: {
          ...state.widgets[widgetId] || defaultTradesState,
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
  }
})); 