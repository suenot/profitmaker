import { db } from '../db';
import { dashboards, widgets } from '../db/schema/dashboards';
import { groups } from '../db/schema/groups';
import { dataProviders } from '../db/schema/providers';
import { userSettings } from '../db/schema/user_settings';

const DEFAULT_WIDGETS = [
  {
    type: 'chart',
    defaultTitle: 'Chart',
    position: { x: 0, y: 0, width: 800, height: 500, zIndex: 1 },
    config: {},
  },
  {
    type: 'orderbook',
    defaultTitle: 'Order Book',
    position: { x: 810, y: 0, width: 350, height: 500, zIndex: 2 },
    config: {},
  },
  {
    type: 'trades',
    defaultTitle: 'Trades',
    position: { x: 1170, y: 0, width: 350, height: 500, zIndex: 3 },
    config: {},
  },
  {
    type: 'orderForm',
    defaultTitle: 'Order Form',
    position: { x: 810, y: 510, width: 350, height: 400, zIndex: 4 },
    config: {},
  },
  {
    type: 'userBalances',
    defaultTitle: 'Balances',
    position: { x: 0, y: 510, width: 800, height: 400, zIndex: 5 },
    config: {},
  },
  {
    type: 'userTradingData',
    defaultTitle: 'Trading Data',
    position: { x: 1170, y: 510, width: 350, height: 400, zIndex: 6 },
    config: {},
  },
];

export const createDefaultDashboard = async (userId: string) => {
  // Create default group (transparent)
  const [defaultGroup] = await db.insert(groups).values({
    userId,
    name: 'Default',
    color: 'transparent',
    exchange: 'binance',
    market: 'spot',
    tradingPair: 'BTC/USDT',
  }).returning();

  // Create default server provider (browser CCXT path was removed in Stage 2;
  // serverUrl is resolved client-side: VITE_SERVER_URL → page origin → localhost)
  await db.insert(dataProviders).values({
    id: `primary-server-${userId.slice(0, 8)}`,
    userId,
    name: 'Primary Server',
    type: 'ccxt-server',
    status: 'connected',
    exchanges: ['*'],
    priority: 1,
    config: { sandbox: false },
  }).onConflictDoNothing();

  // Create default dashboard
  const [dashboard] = await db.insert(dashboards).values({
    userId,
    title: 'Main Dashboard',
    isDefault: true,
    layout: { gridSize: { width: 1920, height: 1080 }, snapToGrid: true, gridStep: 10 },
  }).returning();

  // Create default widgets
  for (const widgetDef of DEFAULT_WIDGETS) {
    await db.insert(widgets).values({
      dashboardId: dashboard.id,
      ...widgetDef,
      groupId: defaultGroup.id,
      showGroupSelector: true,
      isVisible: true,
      isMinimized: false,
    });
  }

  // Save default settings
  await db.insert(userSettings).values([
    { userId, key: 'activeDashboardId', value: dashboard.id },
    { userId, key: 'selectedGroupId', value: defaultGroup.id },
    { userId, key: 'theme', value: 'dark' },
    { userId, key: 'dataFetchSettings', value: { method: 'websocket', restIntervals: { trades: 1000, candles: 5000, orderbook: 500, balance: 30000, ticker: 600000 } } },
  ]);

  return { dashboard, defaultGroup };
};
