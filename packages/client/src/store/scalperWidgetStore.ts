import { create } from 'zustand';
import {
  defaultLayout,
  type PaneId,
  type PaneLayout,
} from '@/components/widgets/scalper/panelLayout';

/**
 * Per-widget state for the Scalper widget: which panes are on, in what order and
 * how wide, which bottom sections are shown, and the aggregation knobs.
 *
 * Held here rather than in the widget so the settings drawer and the widget edit
 * the same thing, and so a pane the user turned off stays off when the widget
 * re-renders or the dashboard re-mounts it. Same shape as tradesWidgetStore:
 * one record per widgetId, defaults filled in on read.
 */

export type BottomSectionId = 'position' | 'order' | 'pnl';

export interface ScalperWidgetState {
  layout: PaneLayout;
  /** Master switch for the whole bottom bar. */
  showBottomBar: boolean;
  bottomVisible: Record<BottomSectionId, boolean>;
  /** Cluster candle duration, ms. */
  clusterTimeframe: number;
  /** Prints per tick candle. */
  ticksPerCandle: number;
  /** Order size used by click-trading and the market buttons. */
  quantity: string;
  /** Tape: hide anything below this volume. */
  volumeFilter: number;
  /** Header strip with the axis controls and quick trade buttons. */
  showHeader: boolean;
}

const defaultState = (): ScalperWidgetState => ({
  layout: defaultLayout(),
  showBottomBar: true,
  bottomVisible: { position: true, order: true, pnl: true },
  clusterTimeframe: 5_000,
  ticksPerCandle: 25,
  quantity: '0.001',
  volumeFilter: 0,
  showHeader: true,
});

interface ScalperWidgetsStore {
  widgets: Record<string, ScalperWidgetState>;
  getWidget: (widgetId: string) => ScalperWidgetState;
  updateWidget: (widgetId: string, updates: Partial<ScalperWidgetState>) => void;
  togglePane: (widgetId: string, pane: PaneId) => void;
  toggleBottomSection: (widgetId: string, section: BottomSectionId) => void;
  removeWidget: (widgetId: string) => void;
}

export const useScalperWidgetsStore = create<ScalperWidgetsStore>((set, get) => ({
  widgets: {},

  getWidget: (widgetId) => get().widgets[widgetId] ?? defaultState(),

  updateWidget: (widgetId, updates) =>
    set(state => ({
      widgets: {
        ...state.widgets,
        [widgetId]: { ...(state.widgets[widgetId] ?? defaultState()), ...updates },
      },
    })),

  togglePane: (widgetId, pane) =>
    set(state => {
      const current = state.widgets[widgetId] ?? defaultState();
      return {
        widgets: {
          ...state.widgets,
          [widgetId]: {
            ...current,
            layout: {
              ...current.layout,
              visible: { ...current.layout.visible, [pane]: !current.layout.visible[pane] },
            },
          },
        },
      };
    }),

  toggleBottomSection: (widgetId, section) =>
    set(state => {
      const current = state.widgets[widgetId] ?? defaultState();
      return {
        widgets: {
          ...state.widgets,
          [widgetId]: {
            ...current,
            bottomVisible: { ...current.bottomVisible, [section]: !current.bottomVisible[section] },
          },
        },
      };
    }),

  removeWidget: (widgetId) =>
    set(state => {
      const { [widgetId]: _removed, ...rest } = state.widgets;
      return { widgets: rest };
    }),
}));
