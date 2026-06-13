import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, User, Wallet,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Receipt, Percent,
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useDataProviderStore } from '../../store/dataProviderStore';

/**
 * Transaction History — real account ledger (deposits / withdrawals / transfers
 * / trades / fees) pulled from the exchange via the central-accounts flow:
 * `fetchLedger(accountId)` → server resolves the vault keys (want:'read') and
 * calls ccxt `fetchLedger`. Every listed account is readable by id; no
 * client-side key gate. Empty when the account has no ledger movements.
 */

const TX_LIMIT = 100;

interface LedgerRow {
  id: string;
  timestamp: number;
  type: string; // ccxt ledger type: deposit | withdrawal | transfer | trade | fee | ...
  direction: 'in' | 'out' | null;
  currency: string;
  amount: number;
  status?: string;
  accountId: string;
  exchange: string;
  email: string;
}

function typeMeta(type: string): { label: string; icon: React.ReactNode } {
  switch ((type || '').toLowerCase()) {
    case 'deposit':
      return { label: 'Deposit', icon: <ArrowDownLeft size={18} className="text-green-400" /> };
    case 'withdrawal':
    case 'withdraw':
      return { label: 'Withdrawal', icon: <ArrowUpRight size={18} className="text-red-400" /> };
    case 'transfer':
      return { label: 'Transfer', icon: <ArrowLeftRight size={18} className="text-blue-400" /> };
    case 'trade':
      return { label: 'Trade', icon: <Receipt size={18} className="text-terminal-muted" /> };
    case 'fee':
    case 'commission':
      return { label: 'Fee', icon: <Percent size={18} className="text-orange-400" /> };
    case 'rebate':
    case 'cashback':
      return { label: 'Rebate', icon: <ArrowDownLeft size={18} className="text-green-400" /> };
    default:
      return {
        label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Transaction',
        icon: <Wallet size={18} className="text-terminal-muted" />,
      };
  }
}

function fmtAmount(n: number): string {
  if (!n) return '0';
  if (n < 0.0001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function timeLabel(ts: number): string {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateGroupLabel(ts: number): string {
  if (!ts) return 'Unknown date';
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const TransactionHistoryWidget: React.FC = () => {
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  const { fetchLedger } = useDataProviderStore();

  // Central accounts: keys live server-side; every account with an id is
  // readable via the accountId flow (fetchLedger → want:'read').
  const accounts = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) return [];
    return activeUser.accounts.filter(acc => !!acc.id);
  }, [activeUser?.accounts]);
  const accountIdsKey = accounts.map(a => a.id).join(',');

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!accounts.length) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all: LedgerRow[] = [];
      for (const account of accounts) {
        try {
          const entries = await fetchLedger(account.id, undefined, undefined, TX_LIMIT);
          for (const e of (entries || []) as any[]) {
            const amount = typeof e.amount === 'number' ? e.amount : Number(e.amount) || 0;
            const direction: 'in' | 'out' | null =
              e.direction === 'in' || e.direction === 'out' ? e.direction : amount < 0 ? 'out' : amount > 0 ? 'in' : null;
            all.push({
              id: String(e.id ?? `${account.id}-${e.timestamp}-${e.currency}-${all.length}`),
              timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.parse(e.datetime ?? '') || 0,
              type: e.type ?? 'transaction',
              direction,
              currency: e.currency ?? '',
              amount: Math.abs(amount),
              status: e.status,
              accountId: account.id,
              exchange: account.exchange || 'Unknown',
              email: account.email || account.id,
            });
          }
        } catch (err) {
          console.error(`Failed to load ledger for account ${account.id}:`, err);
          // Continue with other accounts even if one fails.
        }
      }
      all.sort((a, b) => b.timestamp - a.timestamp);
      setRows(all);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, fetchLedger]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side filter over the loaded rows.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      typeMeta(r.type).label.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.currency.toLowerCase().includes(q) ||
      r.exchange.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q),
    );
  }, [rows, query]);

  // Group filtered rows by date (preserving the newest-first order).
  const grouped = useMemo(() => {
    const map = new Map<string, LedgerRow[]>();
    for (const r of filtered) {
      const key = dateGroupLabel(r.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">Not signed in</h3>
        <p className="text-terminal-muted">Sign in with your MarketMaker account to view transactions</p>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Wallet className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No exchange accounts</h3>
        <p className="text-terminal-muted">Add an exchange account (Accounts panel) to view transactions</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: functional search + refresh */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-terminal-muted" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-terminal-accent/30 border border-terminal-border rounded-md py-2 pl-10 pr-3 text-sm w-full"
            placeholder="Search transactions…"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="p-2 rounded hover:bg-terminal-accent/50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`text-terminal-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-grow overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-terminal-muted text-sm">
            Loading transactions…
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-red-500 text-sm mb-2">Error: {error}</p>
            <button onClick={load} className="px-3 py-1 bg-terminal-accent/20 hover:bg-terminal-accent/30 rounded text-xs">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-terminal-muted">
            <Wallet className="w-8 h-8 mb-2 text-terminal-text/60" />
            <p className="text-sm">{rows.length === 0 ? 'No transactions found' : 'No matches'}</p>
          </div>
        ) : (
          grouped.map(([date, list]) => (
            <div key={date} className="mb-4">
              <div className="text-sm font-medium mb-2">{date}</div>
              {list.map((tx) => {
                const meta = typeMeta(tx.type);
                const negative = tx.direction === 'out';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center py-3 border-b border-terminal-border/20 hover:bg-terminal-accent/10"
                  >
                    <div className="mr-3 p-1 rounded-full bg-terminal-accent/30">{meta.icon}</div>
                    <div className="flex-grow min-w-0">
                      <div className="text-sm truncate">{meta.label}</div>
                      <div className="text-xs text-terminal-muted truncate">
                        {tx.exchange}{tx.email ? ` • ${tx.email}` : ''}
                        {tx.status ? ` • ${tx.status}` : ''}
                      </div>
                    </div>
                    <div className="text-right pl-2">
                      <div className={`text-sm ${negative ? 'text-terminal-negative' : 'text-terminal-positive'}`}>
                        {negative ? '-' : '+'}{fmtAmount(tx.amount)} {tx.currency}
                      </div>
                      <div className="text-xs text-terminal-muted">{timeLabel(tx.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryWidget;
