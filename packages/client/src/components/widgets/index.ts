// Export all widgets for easy importing
export { default as Chart } from './Chart';
export { DataProviderSetupWidget } from './DataProviderSetupWidget';
export { DataProviderDebugWidget } from './DataProviderDebugWidget';
export { TradesWidgetV2 as TradesWidget } from './TradesWidget';
export { DataProviderDemoWidget } from './DataProviderDemoWidget';
export { OrderBookWidgetV2 as OrderBookWidget } from './OrderBookWidget';
export { MarketDataWidget } from './MarketDataWidget';
export { DataProviderSettingsWidget } from './DataProviderSettingsWidget';
export { default as TransactionHistory } from './TransactionHistory';
export { default as Portfolio } from './Portfolio';
export { default as OrderForm } from './OrderForm';
export { default as UserBalancesWidget } from './UserBalancesWidget';
export { default as UserTradingDataWidget } from './UserTradingDataWidget';
export { default as LeveragesWidget } from './LeveragesWidget';

// New Deals Widget System
export { default as DealsWidget } from './DealsWidget';
export { default as DealsList } from './DealsList';
export { default as DealDetails } from './DealDetails';
export { default as MyTradesWidget } from './MyTradesWidget';
export { default as DealsWidgetExample } from './DealsWidgetExample';

// Export types
export type { 
  Deal, 
  DealTrade, 
  DealsViewMode, 
  DealsWidgetProps,
  DealsListProps,
  DealDetailsProps,
  DealStatistics 
} from '../../types/deals'; 