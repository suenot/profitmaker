import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { ExchangeAccount } from '../../store/userStore';
import { UserTradingDataWidgetSettings } from '../../store/userTradingDataWidgetStore';
import {
  AccountDataSummary,
  getAccountDataIssue,
  loadAccountData,
  summarizeAccountData,
} from '../../utils/accountDataLoader';
import AccountStatusBanner from './AccountStatusBanner';
import { TabRefreshHandle } from './UserTradesTab';

const getAccountLabel = (account: ExchangeAccount) =>
  account.label || account.email || account.id.slice(0, 8);

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  notional: number;
  percentage: number;
  contracts: number;
  contractSize: number;
  markPrice: number;
  entryPrice: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  timestamp: number;
  info?: any;
}

interface UserPositionsTabProps {
  widgetId: string;
  accounts: ExchangeAccount[];
  settings: UserTradingDataWidgetSettings;
}

const UserPositionsTab = forwardRef<TabRefreshHandle, UserPositionsTabProps>(({
  widgetId,
  accounts,
  settings
}, ref) => {
  const [positions, setPositions] = useState<Array<Position & {
    accountId: string;
    exchange: string;
    email: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusSummary, setStatusSummary] = useState<AccountDataSummary | null>(null);
  const requestIdRef = React.useRef(0);

  const fetchPositions = useDataProviderStore((state) => state.fetchPositions);

  // Load positions for accounts
  const loadPositions = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!accounts.length) {
      setPositions([]);
      setError(null);
      setStatusSummary(null);
      setLoading(false);
      return;
    }

    setPositions([]);
    setLoading(true);
    setError(null);
    setStatusSummary(null);

    try {
      const result = await loadAccountData(
        accounts,
        (account) => fetchPositions(account.id, undefined),
        (progress) => {
          if (requestId !== requestIdRef.current || progress.loaded.length === 0) return;

          const allPositions = progress.loaded.flatMap(({ account, data: accountPositions }) =>
            accountPositions
              .map((position) => ({
                ...position,
                accountId: account.id,
                exchange: account.exchange || 'Unknown',
                email: account.email || 'Unknown'
              }))
              .filter((position) =>
                settings.showZeroPositions || Math.abs(position.amount) > 0.00000001,
              ),
          );

          allPositions.sort((a, b) => Math.abs(b.notional) - Math.abs(a.notional));
          setPositions(allPositions);

          setStatusSummary(summarizeAccountData(progress, getAccountLabel, (data) => data.length, accounts));
        },
      );

      if (requestId !== requestIdRef.current) return;

      const issue = getAccountDataIssue('positions', result, getAccountLabel);
      setError(issue.error);
      setStatusSummary(summarizeAccountData(result, getAccountLabel, (data) => data.length, accounts));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load positions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load positions');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [accounts, fetchPositions, settings.showZeroPositions]);

  // Load positions only when this tab is active
  useEffect(() => {
    // Check if this tab is active
    if (settings.activeTab === 'positions') {
      void loadPositions();
    }
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPositions, settings.activeTab]);

  // Expose refresh() to the parent widget's header refresh button.
  useImperativeHandle(ref, () => ({
    refresh: loadPositions
  }), [loadPositions]);

  // Format currency value
  const formatCurrency = useCallback((value: number, currency?: string) => {
    if (value === 0) return '0';
    
    if (Math.abs(value) < 0.001) {
      return value.toFixed(8);
    } else if (Math.abs(value) < 1) {
      return value.toFixed(6);
    } else if (Math.abs(value) < 1000) {
      return value.toFixed(4);  
    } else {
      return value.toFixed(2);
    }
  }, []);

  // Format PnL with color
  const formatPnl = useCallback((value: number) => {
    const color = value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const prefix = value >= 0 ? '+' : '';
    return {
      value: `${prefix}${formatCurrency(value)}`,
      color
    };
  }, [formatCurrency]);

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: positions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });

  const renderPositionRow = useCallback((position: Position & { 
    accountId: string; 
    exchange: string; 
    email: string; 
  }, index: number, style?: React.CSSProperties) => {
    const pnl = formatPnl(position.unrealizedPnl);
    
    return (
      <div
        key={position.id}
        className={`flex items-center py-3 px-3 text-sm border-b border-terminal-border/30 hover:bg-terminal-accent/10 ${
          index % 2 === 0 ? 'bg-terminal-background/50' : ''
        }`}
        style={style}
      >
        {/* Symbol & Exchange */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="font-medium text-terminal-text">{position.symbol}</div>
          <span className="text-xs text-terminal-muted truncate">
            {position.exchange} • {position.email}
          </span>
        </div>

        {/* Side */}
        <div className="text-center min-w-0 flex-1">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            position.side === 'long' 
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
          }`}>
            {position.side === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {position.side.toUpperCase()}
          </div>
        </div>
        
        {/* Amount */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">{formatCurrency(position.amount)}</div>
          <div className="text-xs text-terminal-muted">Size</div>
        </div>
        
        {/* Entry Price */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">{formatCurrency(position.entryPrice)}</div>
          <div className="text-xs text-terminal-muted">Entry</div>
        </div>
        
        {/* Mark Price */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">{formatCurrency(position.markPrice)}</div>
          <div className="text-xs text-terminal-muted">Mark</div>
        </div>
        
        {/* Notional */}
        <div className="text-right min-w-0 flex-1">
          <div className="font-medium text-terminal-text">{formatCurrency(position.notional)}</div>
          <div className="text-xs text-terminal-muted">Notional</div>
        </div>
        
        {/* Unrealized PnL */}
        <div className="text-right min-w-0 flex-1">
          <div className={`font-medium ${pnl.color}`}>
            {pnl.value}
          </div>
          <div className="text-xs text-terminal-muted">PnL</div>
        </div>
      </div>
    );
  }, [formatCurrency, formatPnl]);

  if (loading && !positions.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-terminal-text/80 mb-2 animate-pulse mx-auto" />
          <p className="text-terminal-muted">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2 mx-auto" />
          <p className="text-red-500">Error: {error}</p>
          <button 
            onClick={loadPositions}
            className="mt-2 px-3 py-1 bg-terminal-accent/20 hover:bg-terminal-accent/30 rounded text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const warningBanner = statusSummary ? (
    <AccountStatusBanner summary={statusSummary} noun="positions" />
  ) : null;

  if (!positions.length) {
    return (
      <div className="h-full flex flex-col">
        {warningBanner}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 text-terminal-text/80 mb-2 mx-auto" />
            <p className="text-terminal-muted">No positions found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {warningBanner}
      {/* Header */}
      <div className="flex items-center py-2 px-3 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
        <div className="min-w-0 flex-1">Symbol / Exchange</div>
        <div className="text-center min-w-0 flex-1">Side</div>
        <div className="text-right min-w-0 flex-1">Size</div>
        <div className="text-right min-w-0 flex-1">Entry</div>
        <div className="text-right min-w-0 flex-1">Mark</div>
        <div className="text-right min-w-0 flex-1">Notional</div>
        <div className="text-right min-w-0 flex-1">PnL</div>
      </div>

      {/* Positions List */}
      <div className="flex-1 overflow-hidden">
        {positions.length > 50 ? (
          // Use virtualization for large lists
          <div ref={parentRef} className="h-full overflow-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const position = positions[virtualRow.index];
                return renderPositionRow(position, virtualRow.index, {
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
          // Render normally for smaller lists
          <div className="overflow-auto">
            {positions.map((position, index) => 
              renderPositionRow(position, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
});

UserPositionsTab.displayName = 'UserPositionsTab';

export default UserPositionsTab;
