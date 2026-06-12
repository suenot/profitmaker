# Widgets

## Overview

Widgets are the building blocks of the trading terminal. Each dashboard contains a collection of widgets that can be freely positioned, resized, minimized, and grouped.

## Widget Types

Widgets are resolved at runtime through the **WidgetRegistry**
(`src/modules/registry.ts`), keyed by a `type` string. Built-ins are registered
in `src/modules/builtinWidgets.tsx`; modules register theirs at load time. The
`type` is a free-form string (`WidgetSchema.type` = `z.string().min(1)`); the
former enum is kept as `BUILTIN_WIDGET_TYPES` for reference. Built-in types:

| Type | Component | Description |
|------|-----------|-------------|
| `chart` | `Chart.tsx` | OHLCV candlestick chart (Night Vision library) |
| `portfolio` | `Portfolio.tsx` | Account portfolio overview |
| `userBalances` | `UserBalancesWidget.tsx` | Exchange balances with pie chart (Recharts) |
| `userTradingData` | `UserTradingDataWidget.tsx` | Tabs: orders, trades, positions |
| `orderForm` | `OrderForm.tsx` | Place buy/sell orders |
| `transactionHistory` | `TransactionHistory.tsx` | Recent transaction log |
| `orderbook` | `OrderBookWidget.tsx` | Live order book (bid/ask depth) |
| `trades` | `TradesWidget.tsx` | Live trade feed |
| `deals` | `DealsWidget.tsx` | Aggregated deals/positions tracking |
| `dataProviderSettings` | `DataProviderSettingsWidget.tsx` | Configure data providers |
| `dataProviderSetup` | `DataProviderSetupWidget.tsx` | Initial provider setup wizard |
| `dataProviderDebug` | `DataProviderDebugWidget.tsx` | Debug provider state |
| `dataProviderDemo` | `DataProviderDemoWidget.tsx` | Demo of provider capabilities |
| `exchanges` | `ExchangesWidget.tsx` | Exchange browser/selector |
| `markets` | `MarketsWidget.tsx` | Market type selector (spot/futures) |
| `pairs` | `PairsWidget.tsx` | Trading pair browser |
| `notificationTest` | `NotificationTestWidget.tsx` | Test notification system |
| `debugUserData` | `DebugUserData.tsx` | Debug user store |
| `debugCCXTCache` | `DebugCCXTCache.tsx` | Debug CCXT instance cache |
| `debugBingX` | `DebugBingXWidget.tsx` | Debug BingX exchange API |

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
| `placeOrderStore` | `store/placeOrderStore.ts` | Order form state |

## Performance Notes

- Widgets with large data sets (trades, orderbook) use **TanStack Virtual** for virtualized scrolling
- Pre-calculate row heights for the virtualizer to avoid layout thrashing
- Use Zustand selectors (`useStore(s => s.field)`) to avoid re-rendering on unrelated state changes
- Subscription deduplication ensures multiple widgets watching the same stream share a single connection
