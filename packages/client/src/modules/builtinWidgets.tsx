import React from 'react';
import type { WidgetDefinition, WidgetProps, WidgetSettingsProps } from '@profitmaker/module-sdk';
import { useWidgetRegistry } from './registry';
import ModuleStoreWidget from './ModuleStoreWidget';

// Built-in widget components (props: { widgetId, selectedGroupId }).
import ChartWidget from '@/components/widgets/Chart';
import PortfolioWidget from '@/components/widgets/Portfolio';
import UserBalancesWidget, { UserBalancesHeaderActions } from '@/components/widgets/UserBalancesWidget';
import UserTradingDataWidget, { UserTradingDataHeaderActions } from '@/components/widgets/UserTradingDataWidget';
import OrderFormWidget from '@/components/widgets/OrderForm';
import TransactionHistoryWidget from '@/components/widgets/TransactionHistory';
import { OrderBookWidgetV2 } from '@/components/widgets/OrderBookWidget';
import { TradesWidgetV2 } from '@/components/widgets/TradesWidget';
import { DataProviderSettingsWidget } from '@/components/widgets/DataProviderSettingsWidget';
import { DataProviderDemoWidget } from '@/components/widgets/DataProviderDemoWidget';
import { DataProviderSetupWidget } from '@/components/widgets/DataProviderSetupWidget';
import { DataProviderDebugWidget } from '@/components/widgets/DataProviderDebugWidget';
import NotificationTestWidget from '@/components/NotificationTestWidget';
import DealsWidget from '@/components/widgets/DealsWidget';
import { DebugUserData } from '@/components/DebugUserData';
import { DebugCCXTCache } from '@/components/DebugCCXTCache';
import { DebugBingXWidget } from '@/components/DebugBingXWidget';
import { ExchangesWidget } from '@/components/ExchangesWidget';
import { MarketsWidget } from '@/components/MarketsWidget';
import { PairsWidget } from '@/components/PairsWidget';

// Built-in settings panels (props: { widgetId, selectedGroupId }).
import ChartSettingsWrapper from '@/components/widgets/ChartSettingsWrapper';
import TradesSettingsWrapper from '@/components/widgets/TradesSettingsWrapper';
import OrderBookSettingsWrapper from '@/components/widgets/OrderBookSettingsWrapper';
import UserBalancesSettingsWrapper from '@/components/widgets/UserBalancesSettingsWrapper';
import UserTradingDataSettingsWrapper from '@/components/widgets/UserTradingDataSettingsWrapper';

/**
 * Built-in widget definition. Extends the SDK contract with `menuLabel`, a
 * presentation-only override for the add-widget menu (the SDK `title` drives the
 * widget *header*, which intentionally differs from the menu text for built-ins
 * such as "Order Book" vs "Order Book (not ready)").
 */
export type BuiltinWidgetDefinition = WidgetDefinition & {
  /** Menu text override; falls back to `title` when omitted. */
  menuLabel?: string;
};

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
const OrderFormSettingsPlaceholder: React.FC<WidgetSettingsProps> = () => (
  <div className="text-terminal-muted">Order Form settings coming soon...</div>
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
    menuLabel: 'Order Book (not ready)',
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
    icon: 'ArrowUpDown',
    category: 'public',
    defaultSize: { width: 600, height: 550 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(TradesWidgetV2),
    Settings: adaptSettings(TradesSettingsWrapper),
  },

  // ---- Private Data ----
  {
    type: 'userBalances',
    title: 'User Balances',
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
    menuLabel: 'User Trading Data (not ready)',
    icon: 'BarChart3',
    category: 'private',
    defaultSize: { width: 800, height: 650 },
    showGroupSelector: false,
    Component: adaptComponent(UserTradingDataWidget),
    Settings: adaptSettings(UserTradingDataSettingsWrapper),
    HeaderActions: headerActionsUserTradingData,
  },
  {
    type: 'deals',
    title: 'Deals',
    menuLabel: 'Deals (not ready)',
    icon: 'Handshake',
    category: 'private',
    defaultSize: { width: 900, height: 600 },
    showGroupSelector: false,
    Component: adaptComponent(DealsWidget),
  },
  {
    type: 'orderForm',
    title: 'Place Order',
    menuLabel: 'Place Order (not ready)',
    icon: 'FileText',
    category: 'private',
    defaultSize: { width: 350, height: 550 },
    showGroupSelector: true,
    needsTransparentGroup: true,
    Component: adaptComponent(OrderFormWidget),
    Settings: OrderFormSettingsPlaceholder,
  },

  // ---- Diagnostics ----
  {
    type: 'exchanges',
    title: 'Exchanges Diagnostic',
    icon: 'Globe',
    category: 'diagnostics',
    defaultSize: { width: 600, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(ExchangesWidget),
  },
  {
    type: 'markets',
    title: 'Markets Diagnostic',
    icon: 'Server',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 450 },
    showGroupSelector: false,
    Component: adaptComponent(MarketsWidget),
  },
  {
    type: 'pairs',
    title: 'Pairs Diagnostic',
    icon: 'TrendingUp',
    category: 'diagnostics',
    defaultSize: { width: 650, height: 550 },
    showGroupSelector: false,
    Component: adaptComponent(PairsWidget),
  },
  {
    type: 'debugUserData',
    title: 'Debug User Data',
    icon: 'Users',
    category: 'diagnostics',
    defaultSize: { width: 600, height: 400 },
    showGroupSelector: false,
    Component: adaptComponent(DebugUserData),
  },
  {
    type: 'debugCCXTCache',
    title: 'Debug CCXT Cache',
    icon: 'Database',
    category: 'diagnostics',
    defaultSize: { width: 700, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(DebugCCXTCache),
  },
  {
    type: 'debugBingX',
    title: 'Debug BingX',
    icon: 'Bug',
    category: 'diagnostics',
    defaultSize: { width: 700, height: 600 },
    showGroupSelector: false,
    Component: adaptComponent(DebugBingXWidget),
  },
  {
    type: 'notificationTest',
    title: 'Notification Test',
    icon: 'Bell',
    category: 'diagnostics',
    defaultSize: { width: 400, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(NotificationTestWidget),
  },
  {
    type: 'dataProviderSettings',
    title: 'Data Provider Settings',
    icon: 'Settings',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 450 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderSettingsWidget),
  },
  {
    type: 'dataProviderDemo',
    title: 'Data Provider Demo',
    icon: 'Bug',
    category: 'diagnostics',
    defaultSize: { width: 700, height: 400 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderDemoWidget),
  },
  {
    type: 'dataProviderSetup',
    title: 'Data Provider Setup',
    icon: 'Settings',
    category: 'diagnostics',
    defaultSize: { width: 500, height: 400 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderSetupWidget),
  },
  {
    type: 'dataProviderDebug',
    title: 'Data Provider Debug',
    icon: 'Bug',
    category: 'diagnostics',
    defaultSize: { width: 700, height: 500 },
    showGroupSelector: false,
    Component: adaptComponent(DataProviderDebugWidget),
  },

  // ---- System (renderable from persisted dashboards; not in the add menu) ----
  {
    type: 'portfolio',
    title: 'Balance',
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
    icon: 'Package',
    category: 'system',
    defaultSize: { width: 700, height: 550 },
    showGroupSelector: false,
    Component: ModuleStoreWidget as React.ComponentType<WidgetProps>,
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

  // 'orderbook' was historically also referenced as 'orderBook' (camelCase) in
  // the settings switch. Register an alias so either spelling resolves and shows
  // the order-book settings panel.
  const orderbook = BUILTIN_DEFINITIONS.find((d) => d.type === 'orderbook');
  if (orderbook) {
    useWidgetRegistry.getState().register({ ...orderbook, type: 'orderBook' });
  }
}
