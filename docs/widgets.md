# Widgets

## Overview

Widgets are the building blocks of the trading terminal. Each dashboard contains a collection of widgets that can be freely positioned, resized, minimized, and grouped.

## Widget Types

Widgets are resolved at runtime through the **WidgetRegistry**
(`src/modules/registry.ts`), keyed by a `type` string. Built-ins are registered
in `src/modules/builtinWidgets.tsx`; modules register theirs at load time. The
`type` is a free-form string (`WidgetSchema.type` = `z.string().min(1)`); the
former enum is kept as `BUILTIN_WIDGET_TYPES` for reference.

Every data widget renders **live exchange data**, never mock or placeholder
fixtures. Public market data (chart, order book, trades) streams through the
data-provider layer; private widgets (balances, trading data, deals, transaction
history, portfolio, order form) resolve per account via the central-accounts
`{ accountId }` flow (`want: 'read'` for reads, `'trade'` for orders) — the
server attaches the vault keys before calling CCXT, so the browser never holds
secrets. Each private widget gates on `acc => !!acc.id` (any listed account, own
or shared-with-read) rather than client-side key presence.

`category` controls where a widget appears: `public` → Public Data menu,
`private` → Private Data menu, `diagnostics` → Diagnostics submenu, `module`
widgets → Modules. `system` widgets are registered (renderable from saved
dashboards) but not offered in the add-widget menu.

Built-in types:

| Type | Component | Category | Description |
|------|-----------|----------|-------------|
| `chart` | `Chart.tsx` | public | Live OHLCV candlestick chart (Night Vision) |
| `orderbook` | `OrderBookWidget.tsx` | public | Live order book (bid/ask depth, spread) |
| `trades` | `TradesWidget.tsx` | public | Live trade feed (filtering, aggregated mode) |
| `footprint` | `FootprintWidget.tsx` | public | Cluster chart: bid/ask volume per price, imbalances, POC |
| `heatmap` | `HeatmapWidget.tsx` | public | Order-book depth over time, with trades on top |
| `userBalances` | `UserBalancesWidget.tsx` | private | Real balances across all accounts, table or pie view (Recharts), USD-valued |
| `dom` | `DomLadderWidget.tsx` | private | Price ladder with click-to-trade and scalper hotkeys |
| `scalper` | `ScalperWidget.tsx` | private | Cluster + bubbles + DOM on one shared price axis, with click-trading |
| `userTradingData` | `UserTradingDataWidget.tsx` | private | Tabs: trades, positions, open orders (real, per account) |
| `leverages` | `LeveragesWidget.tsx` | private | Leverage per pair on one account (swap/futures), with single and bulk set |
| `deals` | `DealsWidget.tsx` | private | Deal tracking aggregated from real trade history |
| `orderForm` | `OrderForm.tsx` | private | Place buy/sell orders — live ticker + real balance |
| `dataProviderSettings` | `DataProviderSettingsWidget.tsx` | diagnostics | Configure data providers |
| `dataProviderSetup` | `DataProviderSetupWidget.tsx` | diagnostics | Initial provider setup wizard |
| `portfolio` | `Portfolio.tsx` | system | Cross-account allocation overview (USD-valued) |
| `transactionHistory` | `TransactionHistory.tsx` | system | Real exchange ledger, grouped by date |
| `custom` | `Portfolio.tsx` | system | Legacy alias, rendered as Portfolio |
| `system.moduleStore` | `ModuleStoreWidget` | system | Browse / install / enable modules |
| `system.docs` | `DocsWidget` | system | In-app API / CLI / MCP reference |

Dev-only diagnostic widgets (registered only when `import.meta.env.DEV`) expose
raw provider/exchange internals: `exchanges`, `markets`, `pairs`, and
`dataProviderDebug`.

## Trading Widgets in Detail

All of the widgets below render **live exchange data**. Reads route through the
data-provider store; private reads (balances, trades, orders, positions, ledger)
go via the central-accounts `{ accountId }` flow.

- **Chart / Order Book / Trades** (`Chart.tsx`, `OrderBookWidget.tsx`,
  `TradesWidget.tsx`) — public market data. Each carries a group selector and
  uses a transparent group, so picking exchange / market / pair flows to linked
  widgets. Streams over WebSocket (CCXT Pro) with REST fallback.

- **User Balances** (`UserBalancesWidget.tsx`) — real balances across every
  account, both `trading` and `funding` wallets, fetched with
  `initializeBalanceData(accountId, walletType)`. Filter / sort, hide-small-amounts,
  USD valuation (stablecoins 1:1, otherwise `CURRENCY/USDT` ticker bid), a total
  portfolio line, and a table-or-pie view (`UserBalancesPieChart`, Recharts).
  Header refresh button clears then re-fetches.

- **User Trading Data** (`UserTradingDataWidget.tsx`) — three tabs backed by real
  per-account calls: **Trades** (`UserTradesTab` → `fetchMyTrades`), **Positions**
  (`UserPositionsTab` → `fetchPositions`), **Orders** (`UserOrdersTab` →
  `fetchOpenOrders`). An account selector (all / one) drives every tab; the header
  refresh button re-fetches the active tab via an imperative handle. Long lists are
  virtualized.

- **Leverages** (`LeveragesWidget.tsx`) — leverage settings for one account's
  derivative pairs. Two sources kept apart: `leverageMarkets(accountId, marketType)`
  gives every pair plus the cap the exchange publishes (from market metadata, so
  it is immediate and complete), while `fetchLeverages(accountId, symbols?)` gives
  what the account actually has set. Only some exchanges answer for everything at
  once: bybit has no batch call, and the no-symbol fallback (open positions) says
  nothing about the pairs an account is flat on. So the table is virtualized and
  reads leverage for the rows on screen as you scroll or filter (debounced, one
  request per visible batch, each symbol asked at most once per reload); "Load
  all" walks whatever is left in chunks of 50 with progress. Per-symbol reads run
  5-at-a-time server side, which is what keeps a 50-pair chunk from being 50
  round-trips end to end, and results are cached there for 5 minutes per account
  (invalidated per pair on write), so reopening the widget does not re-read the
  whole exchange. The reload button passes `refresh` and bypasses that cache.
  Writing goes through `setLeverages(accountId, symbols,
  target)` in chunks of 20: per-row set, "set all shown to X", and "set all to
  max" (each pair's own published maximum). Bulk runs are confirmed in a dialog
  first and report per-symbol failures — an open position makes the exchange
  refuse the change. A donut summarizes how many pairs sit in each leverage
  bucket (1x, 2-5x, 6-10x, 11-20x, 21-50x, 50x+).

- **Scalper** (`ScalperWidget.tsx`, helpers under `widgets/scalper/`) — the
  scalper.marketmaker panel, ported from `scalper-iced` (Unlicense). Several
  views of one instrument share a single price axis (`scalper/priceAxis.ts`), so
  a price sits at the same height in all of them: cluster chart, bubbles and the
  DOM ladder are on by default, the tick chart and tape are a click or Ctrl+2/5
  away. Panes are reorderable by dragging their header chip and resizable by the
  dividers between them (`scalper/panelLayout.ts`).

  The Rust app read `{orderbook, clusters, ticks}` from a Go aggregator; here the
  same three shapes are built in the browser from the terminal's own order-book
  and trade streams (`scalper/scalperFeed.ts`) — tick candles group a fixed
  number of prints rather than a fixed duration, and clusters are restated from
  the footprint aggregator so the aggressor rule has one implementation.

  On the axis: wheel pans, Shift+wheel zooms, Ctrl+wheel walks the grouping
  ladder, `r` toggles follow (auto/locked/manual), Shift re-centres. Trading
  mirrors the DOM ladder — clicking a ladder row places a limit order there,
  `t`/`y` buy/sell at market, `d` flattens, Space cancels everything, Escape does
  both. All of it needs an account on the widget's group; without one the panes
  still render, the buttons do not.

- **Deals** (`DealsWidget.tsx`) — deal tracking built from real trade history.
  "Sync from account" pulls `fetchMyTrades` for each account and aggregates trades
  into deals (grouped by symbol) in the persisted `dealsStore`; the per-deal "Add
  Trades" picker (`MyTradesWidget`, also `fetchMyTrades`-backed) is the other live
  entry point. P&L is computed in deal details, not faked at the source.

- **Order Form** (`OrderForm.tsx`) — places real orders. Reads the instrument from
  the selected group (account / exchange / market / pair), subscribes to the live
  **ticker** for the last price, and loads the real account **balance** to drive
  available / holdings / max-amount and cost estimation. Market / limit / stop
  order types, optional stop-loss & take-profit, persisted defaults (order type,
  TIF, post/reduce-only), and an optional confirm-before-submit gate. Submit calls
  `placeOrder` (trade write via the `accountId` flow).

- **Transaction History** (`TransactionHistory.tsx`) — real account ledger via
  `fetchLedger(accountId)` (deposits / withdrawals / transfers / trades / fees),
  merged across accounts, grouped by date (Today / Yesterday / full date), with
  in/out direction coloring and a client-side search. Empty when the account has
  no ledger movements.

- **Portfolio** (`Portfolio.tsx`) — cross-account allocation. Loads every
  account's balances, values them in USD (stablecoin 1:1, else `CURRENCY/USDT`
  ticker bid), and shows total value, Assets / Accounts KPIs, an allocation
  **donut** (one slice per asset, color-matched to the per-asset table below it),
  and a per-asset breakdown with allocation bars. No cost basis is available from
  balances, so P&L columns are intentionally omitted rather than faked.

## Widget Container: WidgetSimple

Every widget is wrapped in `WidgetSimple` (`src/components/WidgetSimple.tsx`), which provides:

- **Drag** -- click and drag the title bar
- **Resize** -- 8 resize handles (edges + corners)
- **Minimize** -- collapses to a small bar at the bottom
- **Maximize** -- fills the viewport, restores on second click
- **Title editing** -- double-click the title to rename
- **Close** -- removes the widget from the dashboard
- **Settings** -- gear icon, opens widget-specific settings panel
- **Group selector** -- colored circle showing the widget's group
- **Z-index** -- click brings widget to front

### Props

```typescript
interface WidgetSimpleProps {
  id: string;
  title: string;
  defaultTitle: string;
  userTitle?: string;
  children: ReactNode;          // The actual widget content
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  groupId?: string;
  widgetType: string;
  showGroupSelector?: boolean;
  headerActions?: ReactNode;    // Extra buttons in the title bar
  onRemove: () => void;
}
```

## Widget Grouping

Widgets can be assigned to groups via the `groupStore`. A group shares context (exchange, market, trading pair, account) across all its widgets. This means selecting "BTC/USDT on Binance" in one group member automatically updates all others.

Groups are identified by a color indicator on each widget's title bar.

## How to Create a New Widget

> For community or full-stack widgets, build a **module** instead of editing the
> core — see [Modules](modules.md). The steps below are for built-in widgets that
> ship with the terminal.

### 1. Create the component

Create `src/components/widgets/MyNewWidget.tsx`:

```tsx
import React from 'react';

const MyNewWidget: React.FC = () => {
  return (
    <div className="p-4 h-full overflow-auto">
      <h3 className="text-sm font-medium text-terminal-text">My Widget</h3>
      {/* Widget content */}
    </div>
  );
};

export default MyNewWidget;
```

### 2. Register it in the WidgetRegistry

In `src/modules/builtinWidgets.tsx`, import your component and add a
`WidgetDefinition` to `BUILTIN_DEFINITIONS`:

```tsx
import MyNewWidget from '@/components/widgets/MyNewWidget';

// inside BUILTIN_DEFINITIONS:
{
  type: 'myNewWidget',
  title: 'My Widget',
  icon: 'PieChart',                 // a lucide name in resolveIcon's map
  category: 'public',               // 'public' | 'private' | 'diagnostics' | 'system'
  defaultSize: { width: 500, height: 400 },
  Component: adaptComponent(MyNewWidget), // adapter maps WidgetProps -> {widgetId, selectedGroupId}
  // Settings: adaptSettings(MyNewWidgetSettings),  // optional gear panel
},
```

That's the only wiring needed. `category` decides the add-widget menu section
(`public` → Public Data, `private` → Private Data, `diagnostics` → Diagnostics
submenu, `module` widgets → Modules; `system` widgets are registered but not in
the menu). `TradingTerminal`, `WidgetMenu`, `WidgetSettingsManager` and
`WidgetSimple` all read the registry — there is no separate component map, enum,
or menu list to update.

If your widget needs a new icon, add it to the curated map in
`src/modules/resolveIcon.tsx` (don't import lucide's full `icons` barrel — it
bloats the bundle).

### 3. Use market data (optional)

If your widget needs market data, use the data provider store:

```typescript
import { useDataProviderStore } from '@/store/dataProviderStore';

const MyNewWidget: React.FC = () => {
  const subscribe = useDataProviderStore(s => s.subscribe);
  const unsubscribe = useDataProviderStore(s => s.unsubscribe);
  const getTrades = useDataProviderStore(s => s.getTrades);

  useEffect(() => {
    const widgetId = 'my-widget-123';
    subscribe(widgetId, 'binance', 'BTC/USDT', 'trades', undefined, 'spot');

    return () => {
      unsubscribe(widgetId, 'binance', 'BTC/USDT', 'trades', undefined, 'spot');
    };
  }, []);

  const trades = getTrades('binance', 'BTC/USDT', 'spot');
  // render trades...
};
```

## Widget-Specific Stores

Some complex widgets have their own dedicated Zustand stores:

| Store | File | Purpose |
|-------|------|---------|
| `chartWidgetStore` | `store/chartWidgetStore.ts` | Chart settings per widget instance |
| `orderBookWidgetStore` | `store/orderBookWidgetStore.ts` | Order book display settings |
| `tradesWidgetStore` | `store/tradesWidgetStore.ts` | Trades feed settings |
| `userBalancesWidgetStore` | `store/userBalancesWidgetStore.ts` | Balance display preferences |
| `userTradingDataWidgetStore` | `store/userTradingDataWidgetStore.ts` | Trading data tab state |
| `placeOrderStore` | `store/placeOrderStore.ts` | Order form live state (form data, validation, estimate) |
| `orderFormWidgetStore` | `store/orderFormWidgetStore.ts` | Persisted Order Form defaults (order type, TIF, post/reduce-only, confirm) |
| `dealsStore` | `store/dealsStore.ts` | Persisted deals, aggregated from real trades |

## Performance Notes

- Widgets with large data sets (trades, orderbook) use **TanStack Virtual** for virtualized scrolling
- Pre-calculate row heights for the virtualizer to avoid layout thrashing
- Use Zustand selectors (`useStore(s => s.field)`) to avoid re-rendering on unrelated state changes
- Subscription deduplication ensures multiple widgets watching the same stream share a single connection
