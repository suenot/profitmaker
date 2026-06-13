import React, { useMemo, useState, useRef, useEffect } from 'react';
import { TrendingUp, BarChart3, ShoppingCart, User, RefreshCw } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useUserTradingDataWidgetStore, TradingDataTab } from '../../store/userTradingDataWidgetStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import UserTradesTab, { TabRefreshHandle } from './UserTradesTab';
import UserPositionsTab from './UserPositionsTab';
import UserOrdersTab from './UserOrdersTab';

interface UserTradingDataWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

// Header actions component for the widget
export const UserTradingDataHeaderActions: React.FC<{
  widgetId: string;
}> = ({ widgetId }) => {
  const { getWidget, triggerRefresh } = useUserTradingDataWidgetStore();
  const { users, activeUserId } = useUserStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeUser = users.find(u => u.id === activeUserId);

  const accountsWithKeys = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) {
      return [];
    }
    return activeUser.accounts.filter(acc => acc.key && acc.privateKey);
  }, [activeUser?.accounts]);

  const hasValidAccounts = accountsWithKeys.length > 0;

  const handleRefresh = async () => {
    if (!hasValidAccounts || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Delegate to the widget's registered handler, which calls refresh() on the
      // active tab's imperative handle (no remount / tab-toggle hack).
      await triggerRefresh(widgetId);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleRefresh}
        className="p-1 rounded-sm hover:bg-terminal-widget/50 transition-colors"
        title={isRefreshing ? "Refreshing..." : "Refresh data"}
        disabled={!hasValidAccounts || isRefreshing}
      >
        <RefreshCw 
          size={14} 
          className={`text-terminal-muted hover:text-terminal-text transition-colors ${
            isRefreshing ? 'animate-spin' : ''
          }`} 
        />
      </button>
    </div>
  );
};

const UserTradingDataWidget: React.FC<UserTradingDataWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'user-trading-data-widget'
}) => {
  // Store integration
  const { getWidget, updateWidget, registerRefreshHandler, unregisterRefreshHandler } = useUserTradingDataWidgetStore();
  const widgetSettings = getWidget(widgetId).settings;

  // User store integration
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);

  // Refs for tab components to call their refresh methods
  const tradesTabRef = useRef<TabRefreshHandle>(null);
  const positionsTabRef = useRef<TabRefreshHandle>(null);
  const ordersTabRef = useRef<TabRefreshHandle>(null);

  // Get all user accounts with API keys
  const accountsWithKeys = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) {
      return [];
    }
    return activeUser.accounts.filter(acc => acc.key && acc.privateKey);
  }, [activeUser?.accounts]);

  const hasValidAccounts = accountsWithKeys.length > 0;

  // Get selected accounts based on settings
  const selectedAccounts = useMemo(() => {
    if (!hasValidAccounts) return [];

    // If 'all' selected, return all accounts
    if (widgetSettings.selectedAccountId === 'all') {
      return accountsWithKeys;
    }

    // Return specific account (fall back to all if it can't be found)
    const account = accountsWithKeys.find(acc => acc.id === widgetSettings.selectedAccountId);
    return account ? [account] : accountsWithKeys;
  }, [widgetSettings.selectedAccountId, accountsWithKeys, hasValidAccounts]);

  // Handle tab change
  const handleTabChange = (tab: TradingDataTab) => {
    updateWidget(widgetId, { activeTab: tab });
  };

  // Refresh the currently active tab by calling its imperative refresh() handle.
  const handleRefreshData = async () => {
    switch (widgetSettings.activeTab) {
      case 'trades':
        await tradesTabRef.current?.refresh();
        break;
      case 'positions':
        await positionsTabRef.current?.refresh();
        break;
      case 'orders':
        await ordersTabRef.current?.refresh();
        break;
    }
  };

  // Register the refresh handler so the header refresh button (a separate
  // component) can trigger it via the store. Re-register when the active tab
  // changes so the closure always targets the visible tab.
  useEffect(() => {
    registerRefreshHandler(widgetId, handleRefreshData);
    return () => unregisterRefreshHandler(widgetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId, widgetSettings.activeTab, registerRefreshHandler, unregisterRefreshHandler]);

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No Active User</h3>
        <p className="text-terminal-muted">
          Please select or create a user account to view trading data
        </p>
      </div>
    );
  }

  if (!hasValidAccounts) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <BarChart3 className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No API Keys Configured</h3>
        <p className="text-terminal-muted mb-4">
          Add API keys to your exchange accounts to view trading data
        </p>
        <div className="text-sm text-terminal-muted">
          <p>Current user: {activeUser.email}</p>
          <p>Accounts: {activeUser.accounts.length}</p>
          <p>With API keys: {accountsWithKeys.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <Tabs 
        value={widgetSettings.activeTab} 
        onValueChange={(value) => handleTabChange(value as TradingDataTab)}
        className="h-full flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-3 bg-terminal-background border-b border-terminal-border rounded-none h-10">
          <TabsTrigger 
            value="trades" 
            className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
          >
            <TrendingUp className="w-3 h-3" />
            Trades
          </TabsTrigger>
          <TabsTrigger 
            value="positions" 
            className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
          >
            <BarChart3 className="w-3 h-3" />
            Positions
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
          >
            <ShoppingCart className="w-3 h-3" />
            Orders
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trades" className="flex-1 overflow-hidden m-0">
          <UserTradesTab
            ref={tradesTabRef}
            widgetId={widgetId}
            accounts={selectedAccounts}
            settings={widgetSettings}
          />
        </TabsContent>

        <TabsContent value="positions" className="flex-1 overflow-hidden m-0">
          <UserPositionsTab
            ref={positionsTabRef}
            widgetId={widgetId}
            accounts={selectedAccounts}
            settings={widgetSettings}
          />
        </TabsContent>

        <TabsContent value="orders" className="flex-1 overflow-hidden m-0">
          <UserOrdersTab
            ref={ordersTabRef}
            widgetId={widgetId}
            accounts={selectedAccounts}
            settings={widgetSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserTradingDataWidget; 