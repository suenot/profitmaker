// Deal related types
export interface DealTrade {
  uuid: string;
  order: string;
  datetime: string;
  stock: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  fee: number;
}

export interface Deal {
  id: string;
  name: string;
  note?: string;
  stocks: number;
  coins: number;
  pairs: number;
  credited: number;
  debited: number;
  total: number;
  credited_trades: number;
  debited_trades: number;
  total_trades: number;
  timestamp_open: string;
  timestamp_closed: string;
  duration: string;
  trades: DealTrade[];
}

// View modes for the deals widget
export type DealsViewMode = 'list' | 'details';

// Props for the deals widget
export interface DealsWidgetProps {
  dashboardId?: string;
  widgetId?: string;
  initialMode?: DealsViewMode;
  initialDealId?: string;
}

// Props for deals list component
export interface DealsListProps {
  deals: Deal[];
  onSelectDeal: (dealId: string) => void;
  onAddDeal: () => void;
  onEditDeal: (dealId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  /** Aggregate real trade history (fetchMyTrades) into deals. Optional. */
  onSyncFromAccount?: () => void;
  /** True while a sync is in flight (spins the button icon). */
  syncing?: boolean;
}

// Props for deal details component
export interface DealDetailsProps {
  deal: Deal;
  onBack: () => void;
  onUpdateDeal: (updatedDeal: Deal) => void;
  onDeleteTrade: (trade: DealTrade) => void;
  onAddTrades: (trades: any[]) => void;
}

// Deal statistics interface
export interface DealStatistics {
  totalDeals: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  totalTrades: number;
} 