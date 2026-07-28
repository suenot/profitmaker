import React from 'react';
import type { WidgetProps, WidgetSettingsProps } from '@profitmaker/module-sdk';
import { useWidgetRegistry } from './registry';
import { addToBuiltinCatalog, type BuiltinWidgetDefinition } from './builtinCatalog';
import ModuleStoreWidget from './ModuleStoreWidget';
import DocsWidget from './DocsWidget';

// Built-in widget components (props: { widgetId, selectedGroupId }).
import ChartWidget from '@/components/widgets/Chart';
import PortfolioWidget from '@/components/widgets/Portfolio';
import UserBalancesWidget, { UserBalancesHeaderActions } from '@/components/widgets/UserBalancesWidget';
import UserTradingDataWidget, { UserTradingDataHeaderActions } from '@/components/widgets/UserTradingDataWidget';
import LeveragesWidget from '@/components/widgets/LeveragesWidget';
import HeatmapWidget from '@/components/widgets/HeatmapWidget';
import FootprintWidget from '@/components/widgets/FootprintWidget';
import DomLadderWidget from '@/components/widgets/DomLadderWidget';
import ScalperWidget from '@/components/widgets/ScalperWidget';
import OrderFormWidget from '@/components/widgets/OrderForm';
import TransactionHistoryWidget from '@/components/widgets/TransactionHistory';
import { OrderBookWidgetV2 } from '@/components/widgets/OrderBookWidget';
import { TradesWidgetV2 } from '@/components/widgets/TradesWidget';
import { DataProviderSettingsWidget } from '@/components/widgets/DataProviderSettingsWidget';
import { DataProviderSetupWidget } from '@/components/widgets/DataProviderSetupWidget';
import { DataProviderDebugWidget } from '@/components/widgets/DataProviderDebugWidget';
import DealsWidget from '@/components/widgets/DealsWidget';
import { ExchangesWidget } from '@/components/ExchangesWidget';
import { MarketsWidget } from '@/components/MarketsWidget';
import { PairsWidget } from '@/components/PairsWidget';

// Built-in settings panels (props: { widgetId, selectedGroupId }).
import ChartSettingsWrapper from '@/components/widgets/ChartSettingsWrapper';
import TradesSettingsWrapper from '@/components/widgets/TradesSettingsWrapper';
import OrderBookSettingsWrapper from '@/components/widgets/OrderBookSettingsWrapper';
import UserBalancesSettingsWrapper from '@/components/widgets/UserBalancesSettingsWrapper';
import UserTradingDataSettingsWrapper from '@/components/widgets/UserTradingDataSettingsWrapper';
import OrderFormSettingsWrapper from '@/components/widgets/OrderFormSettingsWrapper';

// The definition type and the catalog live in builtinCatalog.ts so the Module
// Store can read them without importing this file (which imports the store
// widget itself — that cycle left ModuleStoreWidget uninitialised at runtime).
export type { BuiltinWidgetDefinition, BuiltinModuleInfo } from './builtinCatalog';
export { getBuiltinDefinition, listBuiltinModules } from './builtinCatalog';

/**
 * Adapt a legacy built-in component (props `{ widgetId, selectedGroupId }`) to
 * the SDK `WidgetProps` contract used by the registry. Built-in components are
 * not modified — they keep their original props; we only map `groupId` →
 * `selectedGroupId`.
 */
function adaptComponent(
  Component: React.ComponentType<{ widgetId: string; selectedGroupId?: string }>
): React.ComponentType<WidgetProps> {
  const Adapted: React.FC<WidgetProps> = ({ widgetId, groupId }) => (
    <Component widgetId={widgetId} selectedGroupId={groupId} />
  );
  Adapted.displayName = `BuiltinWidget(${Component.displayName || Component.name || 'Anonymous'})`;
  return Adapted;
}

/** Adapt a legacy settings wrapper (`{ widgetId, selectedGroupId }`) to `WidgetSettingsProps`. */
function adaptSettings(
  Component: React.ComponentType<{ widgetId: string; selectedGroupId?: string }>
): React.ComponentType<WidgetSettingsProps> {
  const Adapted: React.FC<WidgetSettingsProps> = ({ widgetId, groupId }) => (
    <Component widgetId={widgetId} selectedGroupId={groupId} />
  );
  Adapted.displayName = `BuiltinSettings(${Component.displayName || Component.name || 'Anonymous'})`;
  return Adapted;
}

/** "Coming soon" settings placeholders — preserve the gear button + drawer copy
 *  for widgets that previously had a switch case but no real settings panel. */
const PortfolioSettingsPlaceholder: React.FC<WidgetSettingsProps> = () => (
  <div className="text-terminal-muted">Portfolio settings coming soon...</div>
);

const headerActionsUserTradingData: React.FC<{ widgetId: string }> = ({ widgetId }) => (
  <UserTradingDataHeaderActions widgetId={widgetId} />
);
const headerActionsUserBalances: React.FC<{ widgetId: string }> = ({ widgetId }) => (
  <UserBalancesHeaderActions widgetId={widgetId} />
);

/**
 * Every built-in widget, consolidated from the data that previously lived in
 * TradingTerminal (component map + header actions), WidgetMenu (sizes, titles,
 * group-selector / transparent-group lists, menu sections + icons + labels),
 * WidgetSettingsManager (settings switch) and WidgetSimple (hasSettings list).
 *
 * `category` drives both the menu section and visibility:
 *   - 'public' | 'private' | 'diagnostics' show in their menu section.
 *   - 'system' widgets (portfolio, transactionHistory, custom) are renderable
 *     from persisted dashboards but are NOT offered in the menu — matching the
 *     prior behaviour where they had components but no menu entry.
 *
 * Menu ordering within a category follows array order below.
 */
const BUILTIN_DEFINITIONS: BuiltinWidgetDefinition[] = [
  // ---- Public Data ----
  {
    type: 'chart',
    title: 'Chart',
    description: 'Live OHLCV candlestick chart',
    icon: 'LineChart',
    category: 'public',
    defaultSize: { width: 650, height: 330 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(ChartWidget),
    Settings: adaptSettings(ChartSettingsWrapper),
  },
  {
    type: 'orderbook',
    title: 'Order Book',
    description: 'Live order book — depth and spread',
    icon: 'BookOpen',
    category: 'public',
    defaultSize: { width: 500, height: 650 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(OrderBookWidgetV2),
    Settings: adaptSettings(OrderBookSettingsWrapper),
  },
  {
    type: 'trades',
    title: 'Trades',
    description: 'Live trade feed',
    icon: 'ArrowUpDown',
    category: 'public',
    defaultSize: { width: 600, height: 550 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(TradesWidgetV2),
    Settings: adaptSettings(TradesSettingsWrapper),
  },

  {
    type: 'footprint',
    title: 'Footprint',
    description: 'Cluster chart: bid/ask volume per price, imbalances, POC',
    icon: 'Grid3x3',
    category: 'public',
    defaultSize: { width: 820, height: 560 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(FootprintWidget),
  },
  {
    type: 'heatmap',
    title: 'Heatmap',
    description: 'Order-book depth over time, with trades on top',
    icon: 'Layers',
    category: 'public',
    defaultSize: { width: 760, height: 520 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(HeatmapWidget),
  },

  // ---- Private Data ----
  {
    type: 'userBalances',
    title: 'User Balances',
    description: 'Balances across every account, table or pie',
    icon: 'Wallet',
    category: 'private',
    defaultSize: { width: 700, height: 600 },
    showGroupSelector: false,
    Component: adaptComponent(UserBalancesWidget),
    Settings: adaptSettings(UserBalancesSettingsWrapper),
    HeaderActions: headerActionsUserBalances,
  },
  {
    type: 'userTradingData',
    title: 'User Trading Data',
    description: 'Trades, positions and open orders per account',
    icon: 'BarChart3',
    category: 'private',
    defaultSize: { width: 800, height: 650 },
    showGroupSelector: false,
    Component: adaptComponent(UserTradingDataWidget),
    Settings: adaptSettings(UserTradingDataSettingsWrapper),
    HeaderActions: headerActionsUserTradingData,
  },
  {
    type: 'dom',
    title: 'DOM Ladder',
    description: 'Price ladder with click-to-trade and scalper hotkeys',
    icon: 'Rows3',
    category: 'private',
    defaultSize: { width: 560, height: 700 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(DomLadderWidget),
  },
  {
    type: 'scalper',
    title: 'Scalper',
    description: 'Cluster, bubbles and DOM on one shared price axis, with click-trading',
    icon: 'Columns3',
    category: 'private',
    defaultSize: { width: 1200, height: 760 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(ScalperWidget),
  },
  {
    type: 'leverages',
    title: 'Leverages',
    description: 'Leverage per pair, with single and bulk set',
    icon: 'Gauge',
    category: 'private',
    defaultSize: { width: 780, height: 620 },
    showGroupSelector: false,
    Component: adaptComponent(LeveragesWidget),
  },
  {
    type: 'deals',
    title: 'Deals',
    description: 'Deal tracking built from real trade history',
    icon: 'Handshake',
    category: 'private',
    defaultSize: { width: 900, height: 600 },
    showGroupSelector: false,
    Component: adaptComponent(DealsWidget),
  },
  {
    type: 'orderForm',
    title: 'Place Order',
    description: 'Place buy/sell orders',
    icon: 'FileText',
    category: 'private',
    defaultSize: { width: 350, height: 550 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(OrderFormWidget),
    Settings: adaptSettings(OrderFormSettingsWrapper),
  },

  // ---- Diagnostics ----
  {
    type: 'dataProviderSettings',
    title: 'Data Provider Settings',
    description: 'Configure data providers',
    icon: 'Settings',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 450 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderSettingsWidget),
  },
  {
    type: 'dataProviderSetup',
    title: 'Data Provider Setup',
    description: 'Initial data-provider setup',
    icon: 'Settings',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 400 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderSetupWidget),
  },

  // ---- System (renderable from persisted dashboards; not in the add menu) ----
  {
    type: 'portfolio',
    title: 'Balance',
    description: 'Cross-account allocation overview',
    icon: 'PieChart',
    category: 'system',
    defaultSize: { width: 800, height: 350 },
    showGroupSelector: true,
    Component: adaptComponent(PortfolioWidget),
    Settings: PortfolioSettingsPlaceholder,
  },
  {
    type: 'transactionHistory',
    title: 'Transaction History',
    description: 'Exchange ledger grouped by date',
    icon: 'FileText',
    category: 'system',
    defaultSize: { width: 400, height: 330 },
    showGroupSelector: true,
    Component: adaptComponent(TransactionHistoryWidget),
  },
  {
    // Legacy placeholder type kept for backward compatibility (rendered as Portfolio).
    type: 'custom',
    title: 'Custom',
    hiddenFromStore: true,
    icon: 'PieChart',
    category: 'system',
    defaultSize: { width: 800, height: 350 },
    showGroupSelector: true,
    Component: adaptComponent(PortfolioWidget),
  },
  {
    // Module Store — browse/install/enable/disable terminal modules.
    type: 'system.moduleStore',
    title: 'Module Store',
    description: 'Browse, install and toggle modules',
    locked: true,
    icon: 'Package',
    category: 'system',
    defaultSize: { width: 700, height: 550 },
    showGroupSelector: false,
    Component: ModuleStoreWidget as React.ComponentType<WidgetProps>,
  },
  {
    // API & Agents — in-app reference for driving the terminal via REST/CLI/MCP.
    type: 'system.docs',
    title: 'API & Agents',
    description: 'Driving the terminal via REST, CLI and MCP',
    icon: 'BookOpen',
    category: 'system',
    defaultSize: { width: 760, height: 600 },
    showGroupSelector: false,
    Component: DocsWidget as React.ComponentType<WidgetProps>,
  },
];

// Diagnostic widgets registered only in dev (import.meta.env.DEV). They surface
// raw provider/exchange internals and are not meant for production users.
const DEV_ONLY_DEFINITIONS: BuiltinWidgetDefinition[] = [
  {
    type: 'exchanges',
    title: 'Exchanges Diagnostic',
    description: 'Exchange diagnostics',
    icon: 'Globe',
    category: 'diagnostics',
    defaultSize: { width: 600, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(ExchangesWidget),
  },
  {
    type: 'markets',
    title: 'Markets Diagnostic',
    description: 'Market diagnostics',
    icon: 'Server',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 450 },
    showGroupSelector: false,
    Component: adaptComponent(MarketsWidget),
  },
  {
    type: 'pairs',
    title: 'Pairs Diagnostic',
    description: 'Trading-pair diagnostics',
    icon: 'TrendingUp',
    category: 'diagnostics',
    defaultSize: { width: 650, height: 550 },
    showGroupSelector: false,
    Component: adaptComponent(PairsWidget),
  },
  {
    type: 'dataProviderDebug',
    title: 'Data Provider Debug',
    description: 'Raw provider internals',
    icon: 'Bug',
    category: 'diagnostics',
    defaultSize: { width: 700, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderDebugWidget),
  },
];

let registered = false;

/**
 * Register all built-in widgets into the registry. Idempotent — safe to call
 * more than once (the registry would warn on duplicates otherwise). Must run
 * before the first render (call from main.tsx).
 */
export function registerBuiltinWidgets(): void {
  if (registered) return;
  registered = true;

  const registerMany = useWidgetRegistry.getState().registerMany;
  registerMany(BUILTIN_DEFINITIONS);
  addToBuiltinCatalog(BUILTIN_DEFINITIONS);

  // Dev-only diagnostic widgets (raw provider/exchange internals).
  if (import.meta.env.DEV) {
    registerMany(DEV_ONLY_DEFINITIONS);
    addToBuiltinCatalog(DEV_ONLY_DEFINITIONS, { dev: true });
  }

  // 'orderbook' was historically also referenced as 'orderBook' (camelCase) in
  // the settings switch. Register an alias so either spelling resolves and shows
  // the order-book settings panel. The alias uses category 'system' so it does
  // NOT appear as a second entry in the add-widget menu (only 'orderbook' does).
  const orderbook = BUILTIN_DEFINITIONS.find((d) => d.type === 'orderbook');
  if (orderbook) {
    useWidgetRegistry.getState().register({ ...orderbook, type: 'orderBook', category: 'system' });
  }
}
