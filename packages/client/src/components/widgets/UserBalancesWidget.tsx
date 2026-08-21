import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, RefreshCw, Search, TrendingUp, TrendingDown, Wallet, User } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTheme } from '../../hooks/useTheme';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useUserStore, ExchangeAccount } from '../../store/userStore';
import { useUserBalancesWidgetStore } from '../../store/userBalancesWidgetStore';
import { MarketType, WalletType, Balance } from '../../types/dataProviders';
import { Input } from '../ui/input';
import UserBalancesPieChart from './UserBalancesPieChart';
import {
  createListedSpotMarketLoader,
  getDirectUsdValue,
  resolveListedUsdPrice,
} from './userBalancePricing';

interface UserBalancesWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

interface AccountBalance {
  account: ExchangeAccount;
  balances: Balance[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

// Header actions component for the widget
export const UserBalancesHeaderActions: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const { users, activeUserId } = useUserStore();
  const { initializeBalanceData, updateBalance } = useDataProviderStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const activeUser = users.find(u => u.id === activeUserId);
  // Central accounts: keys live server-side, so we no longer gate on
  // acc.key/privateKey (always absent in the browser). Any listed central
  // account (own or shared-with-read) is balance-readable via the accountId flow.
  const accountsWithKeys = activeUser?.accounts?.filter(acc => !!acc.id) || [];
  const hasValidAccounts = accountsWithKeys.length > 0;

  // Clear balance data for a specific account
  const clearBalanceData = useCallback((accountId: string, walletType: WalletType) => {
    const emptyBalance = {
      timestamp: Date.now(),
      balances: [],
      info: {}
    };
    updateBalance(accountId, emptyBalance, walletType);
  }, [updateBalance]);

  // Use the exact same logic as subscribeToAllAccounts from the main widget but with clear first
  const handleRefresh = useCallback(async () => {
    if (!hasValidAccounts || isRefreshing) return;
    
    setIsRefreshing(true);
    console.log(`🔄 [USER-BALANCES-WIDGET-REFRESH] Starting balance refresh for ${accountsWithKeys.length} accounts`);
    
    try {
      // STEP 1: Clear all balance data first
      console.log(`🗑️ [USER-BALANCES-WIDGET-REFRESH] Clearing existing balance data...`);
      for (const account of accountsWithKeys) {
        clearBalanceData(account.id, 'trading');
        clearBalanceData(account.id, 'funding');
        console.log(`🗑️ [USER-BALANCES-WIDGET-REFRESH] Cleared balances for account ${account.id} (${account.exchange})`);
      }
      
      // Small delay to ensure UI updates with cleared data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // STEP 2: Fetch fresh balance data
      console.log(`📥 [USER-BALANCES-WIDGET-REFRESH] Fetching fresh balance data...`);
      for (const account of accountsWithKeys) {
        try {
          console.log(`🚀 [USER-BALANCES-WIDGET-REFRESH] Fetching balances for account ${account.id} (${account.exchange}:${account.label || account.email || ''})`);
          
          // Fetch both trading and funding balances using new architecture - EXACT SAME as subscribeToAllAccounts
          await initializeBalanceData(account.id, 'trading');
          await initializeBalanceData(account.id, 'funding');
          
          console.log(`✅ [USER-BALANCES-WIDGET-REFRESH] Fetched balances for account ${account.id} (${account.exchange})`);
        } catch (error) {
          console.error(`❌ [USER-BALANCES-WIDGET-REFRESH] Failed to fetch balances for account ${account.id} (${account.exchange}):`, error);
        }
      }
      
      console.log(`✅ [USER-BALANCES-WIDGET-REFRESH] Refresh completed for User Balances`);
    } catch (error) {
      console.error(`❌ [USER-BALANCES-WIDGET-REFRESH] Refresh failed:`, error);
    } finally {
      setIsRefreshing(false);
    }
  }, [hasValidAccounts, isRefreshing, accountsWithKeys, initializeBalanceData, clearBalanceData]);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleRefresh}
        className="p-1 rounded-sm hover:bg-terminal-widget/50 transition-colors"
        title={isRefreshing ? "Refreshing..." : "Refresh balances"}
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

const UserBalancesWidget: React.FC<UserBalancesWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'user-balances-widget'
}) => {
  // Store integration
  const { 
    subscribe, 
    unsubscribe, 
    initializeBalanceData,
    getBalance,
    getActiveSubscriptionsList,
    getOrderBook,
    getTickerWithRefresh,
    getSymbolsForExchange,
    activeProviderId,
  } = useDataProviderStore();

  // User store integration
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  
  // Widget settings integration
  const { getWidget } = useUserBalancesWidgetStore();
  const widgetSettings = getWidget(widgetId).settings;
  
  // Debug user state
  useEffect(() => {
    console.log(`🔍 [UserBalances] User state:`, {
      usersCount: users.length,
      activeUserId,
      activeUser: activeUser ? {
        id: activeUser.id,
        email: activeUser.email,
        accountsCount: activeUser.accounts.length,
        accounts: activeUser.accounts.map(acc => ({
          id: acc.id,
          exchange: acc.exchange,
          label: acc.label || acc.email,
          access: acc.access_level
        }))
      } : null
    });
  }, [users, activeUserId, activeUser]);

  // Widget state
  const [accountBalances, setAccountBalances] = useState<Map<string, AccountBalance>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'currency' | 'total' | 'free' | 'used' | 'account' | 'walletType' | 'usdValue' | 'percentage'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loadingPrices, setLoadingPrices] = useState<Set<string>>(new Set());
  const [usdValues, setUsdValues] = useState<Map<string, { value?: number, rate?: string, loading: boolean }>>(new Map());

  const getListedSpotMarkets = useMemo(
    () => createListedSpotMarketLoader(getSymbolsForExchange),
    [activeProviderId, getSymbolsForExchange],
  );


  // Theme integration
  const { theme } = useTheme();

  // Get balances for all user accounts - CRITICAL: Direct call without useMemo to enable Zustand auto-subscription
  const getAllBalances = () => {
    if (!activeUser?.accounts) return [];
    
    const balances: Array<{
      accountId: string;
      exchange: string;
      email: string;
      walletType: WalletType;
      balances: Balance[];
      timestamp?: number;
    }> = [];
    
    activeUser.accounts.forEach(account => {
      // Central accounts have no client-side keys; every listed account is
      // balance-readable server-side via the accountId flow.
      ['trading', 'funding'].forEach(walletType => {
        // IMPORTANT: Direct call to getBalance() creates automatic Zustand subscription
        const exchangeBalances = getBalance(account.id, walletType as WalletType);

        if (exchangeBalances?.balances && exchangeBalances.balances.length > 0) {
          balances.push({
            accountId: account.id,
            exchange: account.exchange,
            email: account.label || account.email || account.exchange,
            walletType: walletType as WalletType,
            balances: exchangeBalances.balances,
            timestamp: exchangeBalances.timestamp
          });
        }
      });
    });
    
    return balances;
  };

  // Execute the function directly in render to maintain Zustand subscription
  const allBalances = getAllBalances();

  // Debug logging for balance subscription
  useEffect(() => {
    console.log(`💰 [UserBalances-${widgetId}] Balance data updated:`, {
      widgetId,
      activeUserId,
      totalAccounts: activeUser?.accounts?.length || 0,
      balanceGroups: allBalances.length,
      totalBalances: allBalances.reduce((sum, group) => sum + group.balances.length, 0),
      lastUpdates: allBalances.map(group => ({
        accountId: group.accountId,
        exchange: group.exchange,
        walletType: group.walletType,
        balancesCount: group.balances.length,
        timestamp: group.timestamp
      }))
    });
  }, [allBalances, widgetId, activeUserId, activeUser?.accounts]);

  // Get USD value from cached state or return loading indicator
  const calculateUsdValue = useCallback((currency: string, amount: number, exchange: string, accountId: string): { value?: number, rate?: string, loading: boolean } => {
    const directValue = getDirectUsdValue(currency, amount);
    if (directValue) {
      return { ...directValue, loading: false };
    }
    
    // Check cached USD values
    const priceKey = `${exchange}:${currency}:${amount}`;
    const cachedValue = usdValues.get(priceKey);
    
    if (cachedValue) {
      return cachedValue;
    }
    
    // If no cached value, trigger async price fetch
    fetchUsdPrice(currency, amount, exchange, accountId);
    
    return { value: undefined, loading: true };
  }, [usdValues]);
  
  // Async function to fetch USD price using tickers
  const fetchUsdPrice = useCallback(async (currency: string, amount: number, exchange: string, accountId: string) => {
    const priceKey = `${exchange}:${currency}:${amount}`;
    
    // Skip if already loading or cached
    if (usdValues.has(priceKey)) {
      return;
    }
    
    // Set loading state
    setUsdValues(prev => new Map(prev).set(priceKey, { loading: true }));
    
    const result = await resolveListedUsdPrice({
      currency,
      amount,
      exchange,
      getListedSpotMarkets,
      getTickerWithRefresh,
    });

    setUsdValues(prev => new Map(prev).set(priceKey, {
      ...result,
      loading: false,
    }));
  }, [getListedSpotMarkets, getTickerWithRefresh, usdValues]);

  // Filter and sort balances
  const filteredAndSortedBalances = useMemo(() => {
    // Flatten balances from all accounts
    let flatBalances: (Balance & { 
      accountId: string; 
      exchange: string; 
      email: string; 
      walletType: WalletType;
      timestamp?: number;
      usdRate?: string;
      priceLoading?: boolean;
      percentage?: number;
    })[] = [];
    
    allBalances.forEach(accountBalance => {
      accountBalance.balances.forEach(balance => {
        const usdData = calculateUsdValue(balance.currency, balance.total, accountBalance.exchange, accountBalance.accountId);
        
        flatBalances.push({
          ...balance,
          accountId: accountBalance.accountId,
          exchange: accountBalance.exchange,
          email: accountBalance.email,
          walletType: accountBalance.walletType,
          timestamp: accountBalance.timestamp,
          usdValue: usdData.value,
          usdRate: usdData.rate,
          priceLoading: usdData.loading
        });
      });
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      flatBalances = flatBalances.filter(balance => 
        balance.currency.toLowerCase().includes(query) ||
        balance.exchange.toLowerCase().includes(query) ||
        balance.email.toLowerCase().includes(query)
      );
    }

    // Filter out zero balances
    flatBalances = flatBalances.filter(balance => balance.total > 0);

    // Apply small amount filtering if enabled
    if (widgetSettings.hideSmallAmounts) {
      flatBalances = flatBalances.filter(balance => 
        balance.usdValue === undefined || balance.usdValue >= widgetSettings.smallAmountThreshold
      );
    }

    // Calculate total USD value for percentage calculation
    const totalUsdValue = flatBalances.reduce((sum, balance) => {
      return sum + (balance.usdValue || 0);
    }, 0);

    // Calculate percentage for each balance
    flatBalances = flatBalances.map(balance => ({
      ...balance,
      percentage: totalUsdValue > 0 && balance.usdValue ? (balance.usdValue / totalUsdValue) * 100 : 0
    }));

    // Apply sorting
    flatBalances.sort((a, b) => {
      let compareResult = 0;
      
      switch (sortBy) {
        case 'currency':
          compareResult = a.currency.localeCompare(b.currency);
          break;
        case 'total':
          compareResult = a.total - b.total;
          break;  
        case 'free':
          compareResult = a.free - b.free;
          break;
        case 'used':
          compareResult = a.used - b.used;
          break;
        case 'account':
          compareResult = a.exchange.localeCompare(b.exchange) ||
                        a.email.localeCompare(b.email);
          break;
        case 'walletType':
          compareResult = a.walletType.localeCompare(b.walletType);
          break;
        case 'usdValue':
          // Values without a market price stay at the end in either direction.
          if (a.usdValue === undefined && b.usdValue === undefined) {
            return 0;
          } else if (a.usdValue === undefined) {
            return 1;
          } else if (b.usdValue === undefined) {
            return -1;
          } else {
            compareResult = a.usdValue - b.usdValue;
          }
          break;
        case 'percentage':
          compareResult = (a.percentage || 0) - (b.percentage || 0);
          break;
        default:
          compareResult = a.total - b.total;
      }
      
      return sortDirection === 'desc' ? -compareResult : compareResult;
    });

    return flatBalances;
  }, [allBalances, searchQuery, sortBy, sortDirection, calculateUsdValue, widgetSettings.hideSmallAmounts, widgetSettings.smallAmountThreshold]);

  // Format currency value
  const formatCurrency = useCallback((value: number, currency: string) => {
    if (value === 0) return '0';
    
    // Show more decimals for small values
    if (value < 0.001) {
      return value.toFixed(8);
    } else if (value < 1) {
      return value.toFixed(6);
    } else if (value < 1000) {
      return value.toFixed(4);  
    } else {
      return value.toFixed(2);
    }
  }, []);

  // Get wallet addresses for additional info
  const getWalletAddresses = useCallback(async (exchange: string) => {
    try {
      // This would call fetchDepositAddresses() if available
      console.log(`🏦 [UserBalances] Fetching wallet addresses for ${exchange}...`);
      // TODO: Implement wallet address fetching
      // const addresses = await exchangeInstance.fetchDepositAddresses();
    } catch (error) {
      console.warn(`⚠️ [UserBalances] Could not fetch wallet addresses for ${exchange}:`, error);
    }
  }, []);

  // Subscribe to balances for all user accounts
  const subscribeToAllAccounts = useCallback(async () => {
    if (!activeUser?.accounts) {
      console.log(`🚫 [UserBalances] No active user or accounts available`);
      return;
    }
    
    console.log(`🚀 [UserBalances] Starting balance fetch for ${activeUser.accounts.length} central accounts:`,
      activeUser.accounts.map(acc => ({ exchange: acc.exchange, label: acc.label || acc.email }))
    );

    for (const account of activeUser.accounts) {
      // Central accounts: no client-side keys; balances resolve server-side via
      // the accountId flow (want:'read'). No client-key gate.
      try {
        console.log(`🚀 [UserBalances] Fetching balances for account ${account.id} (${account.exchange}:${account.label || account.email || ''})`);

        // Fetch both trading and funding balances using new architecture
        await initializeBalanceData(account.id, 'trading');
        await initializeBalanceData(account.id, 'funding');
        
        console.log(`✅ [UserBalances] Fetched balances for account ${account.id} (${account.exchange})`);
      } catch (error) {
        console.error(`❌ [UserBalances] Failed to fetch balances for account ${account.id} (${account.exchange}):`, error);
      }
    }
  }, [activeUser?.accounts, initializeBalanceData]);



  // Handle sort
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Auto-fetch balances when user changes
  useEffect(() => {
    if (activeUser?.accounts && activeUser.accounts.length > 0) {
      subscribeToAllAccounts();
    }
  }, [activeUser?.accounts, subscribeToAllAccounts]);

  // Central accounts: every listed account (own or shared-with-read) is
  // balance-readable server-side — no client-side key gate.
  const accountsWithKeys = activeUser?.accounts.filter(acc => !!acc.id) || [];
  const hasValidAccounts = accountsWithKeys.length > 0;

  // Calculate total portfolio value for display
  const totalPortfolioValue = useMemo(() => {
    return filteredAndSortedBalances.reduce((sum, balance) => sum + (balance.usdValue || 0), 0);
  }, [filteredAndSortedBalances]);

  // Portfolio Total Component
  const PortfolioTotal = () => {
    if (!widgetSettings.showTotal) return null;
    
    return (
      <div className="p-3 border-t border-terminal-border bg-terminal-background/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-terminal-text">Total Portfolio Value</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            ${formatCurrency(totalPortfolioValue, 'USD')}
          </span>
        </div>
        <div className="text-xs text-terminal-muted mt-1">
          {filteredAndSortedBalances.length} assets • {accountsWithKeys.length} accounts
        </div>
      </div>
    );
  };

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedBalances.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  const renderBalanceRow = useCallback((balance: Balance & { 
    accountId: string; 
    exchange: string; 
    email: string; 
    walletType: WalletType;
    timestamp?: number;
    usdRate?: string;
    priceLoading?: boolean;
    percentage?: number;
  }, index: number, style?: React.CSSProperties) => (
    <div
      key={`${balance.accountId}-${balance.currency}-${balance.walletType}`}
      className={`flex items-center py-2 px-3 text-sm border-b border-terminal-border/30 hover:bg-terminal-accent/10 ${
        index % 2 === 0 ? 'bg-terminal-background/50' : ''
      }`}
      style={style}
    >
      {/* Account info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-terminal-text truncate">
          {balance.currency}
        </span>
        <span className="text-xs text-terminal-muted truncate">
          {balance.exchange} • {balance.email}
        </span>
      </div>

      {/* Wallet Type */}
      <div className="text-center min-w-0 flex-1">
        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          balance.walletType === 'funding' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' 
            : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
        }`}>
          {balance.walletType.toUpperCase()}
        </div>
      </div>
      
      {/* Free amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text truncate">
          {formatCurrency(balance.free, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Free</div>
      </div>
      
      {/* Used amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text truncate">
          {formatCurrency(balance.used, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Locked</div>
      </div>
      
      {/* Total amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="font-medium text-terminal-text truncate">
          {formatCurrency(balance.total, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Total</div>
      </div>
      
      {/* USD Value */}
      <div className="text-right min-w-0 flex-1">
        <div className="font-medium truncate text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
          {balance.priceLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : balance.usdValue !== undefined ? (
            `$${formatCurrency(balance.usdValue, 'USD')}`
          ) : (
            '-'
          )}
        </div>
        <div className="text-xs text-terminal-muted">
          {balance.usdRate ? `(${balance.usdRate})` : 'USD'}
        </div>
      </div>
      
      {/* Percentage */}
      <div className="text-right min-w-0 flex-1">
        <div className="font-medium text-terminal-text truncate">
          {balance.percentage !== undefined && balance.percentage > 0 ? (
            `${balance.percentage.toFixed(2)}%`
          ) : (
            '-'
          )}
        </div>
        <div className="text-xs text-terminal-muted">Share</div>
      </div>
    </div>
  ), [formatCurrency]);

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No Active User</h3>
        <p className="text-terminal-muted">
          Please select or create a user account to view balances
        </p>
      </div>
    );
  }

  if (!hasValidAccounts) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Wallet className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No exchange accounts</h3>
        <p className="text-terminal-muted mb-4">
          Add an exchange account (Accounts panel) to view balances
        </p>
        <div className="text-sm text-terminal-muted">
          <p>Current identity: {activeUser.email}</p>
          <p>Accounts: {activeUser.accounts.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* Search */}
      <div className="p-3 border-b border-terminal-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-text/80" />
          <Input
            type="text"
            placeholder="Search currencies, exchanges, or accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-terminal-bg border-terminal-border text-terminal-text placeholder-terminal-muted focus:outline-none focus:border-terminal-accent"
          />
        </div>
      </div>

      {/* Table Header - only show for table view */}
      {widgetSettings.displayType === 'table' && (
        <div className="flex items-center py-2 px-3 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
        <button
          onClick={() => handleSort('account')}
          className="flex items-center gap-1 min-w-0 flex-1 hover:text-terminal-text"
        >
          Account
          {sortBy === 'account' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('walletType')}
          className="flex items-center gap-1 justify-center text-center min-w-0 flex-1 hover:text-terminal-text"
        >
          Wallet Type
          {sortBy === 'walletType' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('free')}
          className="flex items-center gap-1 justify-end text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Free
          {sortBy === 'free' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('used')}
          className="flex items-center gap-1 justify-end text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Locked
          {sortBy === 'used' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('total')}
          className="flex items-center gap-1 justify-end text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Total
          {sortBy === 'total' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button
          onClick={() => handleSort('usdValue')}
          className="flex items-center gap-1 justify-end text-right min-w-0 flex-1 hover:text-terminal-text"
          aria-label="Sort by USD Value"
          aria-sort={sortBy === 'usdValue' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          USD Value
          {sortBy === 'usdValue' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('percentage')}
          className="flex items-center gap-1 justify-end text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          %
          {sortBy === 'percentage' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3 text-terminal-text/80" /> : <TrendingDown className="h-3 w-3 text-terminal-text/80" />
          )}
        </button>
      </div>
      )}

      {/* Balance List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {filteredAndSortedBalances.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Wallet className="h-8 w-8 text-terminal-text/80 mb-2" />
            <p className="text-terminal-muted">
              {searchQuery ? 'No matching balances found' : 'No balances available'}
            </p>
            <p className="text-xs text-terminal-muted mt-1">
              {activeUser.email}
            </p>
          </div>
        ) : widgetSettings.displayType === 'pie' ? (
          // Pie Chart View
          <div className="h-full p-4">
            <UserBalancesPieChart 
              balances={filteredAndSortedBalances}
              formatCurrency={formatCurrency}
            />
          </div>
        ) : filteredAndSortedBalances.length > 50 ? (
          // Use virtualization for large table lists
          <div ref={parentRef} className="h-full overflow-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const balance = filteredAndSortedBalances[virtualRow.index];
                return renderBalanceRow(balance, virtualRow.index, {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                });
              })}
            </div>
          </div>
        ) : (
          // Render table normally for smaller lists
          <div className="h-full overflow-auto">
            {filteredAndSortedBalances.map((balance, index) =>
              renderBalanceRow(balance, index)
            )}
          </div>
        )}
      </div>

      {/* Portfolio Total */}
      <PortfolioTotal />
    </div>
  );
};

export default UserBalancesWidget;
