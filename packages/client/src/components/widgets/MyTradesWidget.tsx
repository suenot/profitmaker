import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowLeft, Search, User, TrendingUp, Check, RefreshCw } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { useUserStore } from '../../store/userStore';
import { useDataProviderStore } from '../../store/dataProviderStore';

interface MyTrade {
  id: string;
  datetime: string;
  stock: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  fee: number;
  value: number;
  pnl?: number | null;
  orderType: string;
}

interface MyTradesWidgetProps {
  selectionMode?: boolean;
  onBack?: () => void;
  onTradesSelected?: (trades: MyTrade[]) => void;
}

/** Format an epoch-ms timestamp as "YYYY-MM-DD HH:mm:ss". */
const pad = (n: number) => String(n).padStart(2, '0');
function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MyTradesWidget: React.FC<MyTradesWidgetProps> = ({
  selectionMode = false,
  onBack,
  onTradesSelected
}) => {
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Real trade history via the accountId flow (private read, want='read').
  const { users, activeUserId } = useUserStore();
  const { fetchMyTrades } = useDataProviderStore();
  const [myTrades, setMyTrades] = useState<MyTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUser = users.find(u => u.id === activeUserId);
  // Central accounts: keys live server-side; every listed account (own or
  // shared-with-read) is readable via the accountId flow (fetchMyTrades →
  // want:'read'). No client-side key gate.
  const accountsWithKeys = (activeUser?.accounts || []).filter(acc => !!acc.id);

  const loadTrades = useCallback(async () => {
    if (!accountsWithKeys.length) {
      setMyTrades([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all: MyTrade[] = [];
      for (const account of accountsWithKeys) {
        try {
          const trades = await fetchMyTrades(account.id, undefined, undefined, 200);
          for (const t of trades) {
            const raw = t as typeof t & { symbol?: string; cost?: number; fee?: { cost: number }; type?: string };
            const sym = raw.symbol || 'UNKNOWN';
            const value = typeof raw.cost === 'number' ? raw.cost : t.price * t.amount;
            all.push({
              id: t.id,
              datetime: formatDateTime(t.timestamp),
              stock: sym.split('/')[0] || sym,
              symbol: sym,
              type: raw.type || 'market',
              orderType: raw.type || 'market',
              side: t.side,
              price: t.price,
              amount: t.amount,
              value,
              fee: raw.fee?.cost ?? 0,
              pnl: null,
            });
          }
        } catch (err) {
          console.error(`Failed to load trades for account ${account.id}:`, err);
        }
      }
      all.sort((a, b) => (b.datetime > a.datetime ? 1 : -1));
      setMyTrades(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
    // accountsWithKeys is derived each render; key off the id list to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, accountsWithKeys.map(a => a.id).join(','), fetchMyTrades]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Stats computed from the loaded trades (P&L isn't available from fetchMyTrades,
  // so it's omitted rather than faked).
  const stats = {
    totalTrades: myTrades.length,
    totalVolume: myTrades.reduce((sum, t) => sum + t.value, 0),
    totalFees: myTrades.reduce((sum, t) => sum + t.fee, 0),
  };

  const filteredTrades = myTrades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.stock.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.side.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTradeSelection = (tradeId: string) => {
    if (!selectionMode) return;

    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTrades.size === filteredTrades.length) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(filteredTrades.map(trade => trade.id)));
    }
  };

  const handleConfirmSelection = () => {
    const selected = myTrades.filter(trade => selectedTrades.has(trade.id));
    onTradesSelected?.(selected);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <User className="h-5 w-5 text-primary" />
          <span className="font-medium">{selectionMode ? 'Select Trades' : 'My Trades'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadTrades}
            disabled={loading}
            title="Refresh trades"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {selectionMode && selectedTrades.size > 0 && (
            <Button onClick={handleConfirmSelection} className="gap-2">
              <Check className="h-4 w-4" />
              Add Selected ({selectedTrades.size})
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 p-3 overflow-auto">
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <TrendingUp className="h-4 w-4" />
                Total Fees
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(stats.totalFees)}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.totalTrades} trades
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <User className="h-4 w-4" />
                Total Volume
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(stats.totalVolume)}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.totalTrades} trades
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status / empty states */}
          {error && (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-md p-3">
              {error}
            </div>
          )}
          {!error && !accountsWithKeys.length && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No exchange accounts — add one (Accounts panel) to load trade history.
            </div>
          )}
          {!error && accountsWithKeys.length > 0 && !loading && myTrades.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No trades found for the selected account(s).
            </div>
          )}

          {/* Trades Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectionMode && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTrades.size === filteredTrades.length && filteredTrades.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Fee</TableHead>
                  {!selectionMode && <TableHead>P&L</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow 
                    key={trade.id}
                    className={`${trade.side === 'buy' ? 'bg-green-500/5' : 'bg-red-500/5'} ${
                      selectionMode ? 'cursor-pointer hover:bg-muted/50' : ''
                    }`}
                    onClick={() => selectionMode && handleTradeSelection(trade.id)}
                  >
                    {selectionMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedTrades.has(trade.id)}
                          onCheckedChange={() => handleTradeSelection(trade.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-xs">{trade.datetime}</TableCell>
                    <TableCell className="font-medium">{trade.stock}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'buy' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{trade.orderType}</TableCell>
                    <TableCell>{formatCurrency(trade.price)}</TableCell>
                    <TableCell>{formatNumber(trade.amount)}</TableCell>
                    <TableCell>{formatCurrency(trade.value)}</TableCell>
                    <TableCell>{formatCurrency(trade.fee)}</TableCell>
                    {!selectionMode && (
                      <TableCell>
                        {trade.pnl !== null && (
                          <span className={`text-sm font-medium ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!selectionMode && (
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="text-muted-foreground">Total Trades</div>
                <div className="font-bold">{stats.totalTrades}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Fees</div>
                <div className="font-bold">{formatCurrency(stats.totalFees)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Trade</div>
                <div className="font-bold">
                  {formatCurrency(stats.totalTrades > 0 ? stats.totalVolume / stats.totalTrades : 0)}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Real-time trade tracking • Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTradesWidget; 