import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, RefreshCw, Wallet, User, ChevronRight } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useUserStore } from '../../store/userStore';
import { Balance, WalletType } from '../../types/dataProviders';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Allocation palette — shared by the donut slices and the table color dots so
// the two read as one legend.
const PIE_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#F97316', '#EC4899', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E',
];

/**
 * Portfolio — real cross-account allocation overview. Loads every central
 * account's balances (trading + funding) via the accountId flow, values them in
 * USD (stablecoins 1:1, else CURRENCY/USDT ticker bid), then shows total value,
 * an allocation pie, and a per-asset breakdown. No cost-basis is available from
 * balances, so P&L columns are intentionally omitted (rather than faked).
 */

const STABLECOINS = new Set([
  'USDT', 'USDC', 'DAI', 'USDP', 'TUSD', 'PYUSD', 'BUSD', 'SUSD', 'USD',
  'EURC', 'EURS', 'EURT', 'AEUR', 'GBPT', 'TGBP', 'GYEN', 'JPYC',
]);

type FlatBalance = Balance & {
  accountId: string;
  exchange: string;
  email: string;
  walletType: WalletType;
  usdValue?: number;
  priceLoading?: boolean;
  percentage?: number;
};

// Where one asset actually sits: a single (account, wallet) holding of it.
type AssetSource = {
  key: string;
  label: string;
  exchange: string;
  walletType: WalletType;
  total: number;
  free: number;
  used: number;
  usdValue?: number;
  loading: boolean;
  share?: number;
};

function fmtAmount(n: number): string {
  if (!n) return '0';
  if (n < 0.001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  if (n < 1000) return n.toFixed(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtUsd(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PortfolioWidget: React.FC = () => {
  const { initializeBalanceData, getBalance, getTickerWithRefresh } = useDataProviderStore();
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);

  // Central accounts: keys live server-side; every account with an id is
  // balance-readable via the accountId flow (want:'read').
  const accounts = useMemo(() => activeUser?.accounts?.filter(acc => !!acc.id) || [], [activeUser?.accounts]);
  const accountIdsKey = accounts.map(a => a.id).join(',');

  const [usdValues, setUsdValues] = useState<Map<string, { value?: number; loading: boolean }>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((currency: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (!next.delete(currency)) next.add(currency);
      return next;
    });
  }, []);

  const loadBalances = useCallback(async () => {
    for (const account of accounts) {
      try {
        await initializeBalanceData(account.id, 'trading');
        await initializeBalanceData(account.id, 'funding');
      } catch (e) {
        console.error(`[Portfolio] balance load failed for ${account.id}:`, e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, initializeBalanceData]);

  useEffect(() => {
    if (accounts.length) loadBalances();
  }, [loadBalances, accounts.length]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !accounts.length) return;
    setIsRefreshing(true);
    try {
      await loadBalances();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, accounts.length, loadBalances]);

  // USD valuation — mirrors UserBalancesWidget (stablecoin 1:1, else ticker bid).
  const fetchUsdPrice = useCallback(async (currency: string, amount: number, exchange: string) => {
    const key = `${exchange}:${currency}:${amount}`;
    if (usdValues.has(key)) return;
    setUsdValues(prev => new Map(prev).set(key, { loading: true }));
    try {
      for (const quote of ['USDT', 'USDC', 'USD', 'BUSD']) {
        const ticker = await getTickerWithRefresh(exchange, `${currency}/${quote}`, 'spot', false);
        if (ticker?.bid && ticker.bid > 0) {
          setUsdValues(prev => new Map(prev).set(key, { value: amount * ticker.bid, loading: false }));
          return;
        }
      }
      setUsdValues(prev => new Map(prev).set(key, { value: undefined, loading: false }));
    } catch {
      setUsdValues(prev => new Map(prev).set(key, { value: undefined, loading: false }));
    }
  }, [getTickerWithRefresh, usdValues]);

  const usdFor = useCallback((currency: string, amount: number, exchange: string): { value?: number; loading: boolean } => {
    if (STABLECOINS.has(currency)) return { value: amount, loading: false };
    const cached = usdValues.get(`${exchange}:${currency}:${amount}`);
    if (cached) return cached;
    fetchUsdPrice(currency, amount, exchange);
    return { value: undefined, loading: true };
  }, [usdValues, fetchUsdPrice]);

  // Direct getBalance() in render keeps the zustand subscription live (same
  // pattern as UserBalancesWidget) — do NOT memoize this away.
  const flat: FlatBalance[] = [];
  accounts.forEach(account => {
    (['trading', 'funding'] as WalletType[]).forEach(wt => {
      const data = getBalance(account.id, wt);
      data?.balances?.forEach((bal: Balance) => {
        if (bal.total > 0) {
          const usd = usdFor(bal.currency, bal.total, account.exchange);
          flat.push({
            ...bal,
            accountId: account.id,
            exchange: account.exchange,
            email: account.label || account.email || account.exchange,
            walletType: wt,
            usdValue: usd.value,
            priceLoading: usd.loading,
          });
        }
      });
    });
  });

  const totalUsd = flat.reduce((s, b) => s + (b.usdValue || 0), 0);
  flat.forEach(b => {
    b.percentage = totalUsd > 0 && b.usdValue ? (b.usdValue / totalUsd) * 100 : 0;
  });

  // Aggregate by asset for the breakdown list. Each asset keeps its per-account
  // sources so the row can expand into a "where is this coin" accordion.
  const holdingsMap = new Map<string, { currency: string; total: number; usdValue: number; loading: boolean; sources: AssetSource[] }>();
  flat.forEach(b => {
    const e = holdingsMap.get(b.currency) || { currency: b.currency, total: 0, usdValue: 0, loading: false, sources: [] };
    e.total += b.total;
    e.usdValue += b.usdValue || 0;
    e.loading = e.loading || !!b.priceLoading;
    // One source per (account, wallet) — trading and funding stay separate so a
    // coin parked on funding is visible as such.
    e.sources.push({
      key: `${b.accountId}:${b.walletType}`,
      label: b.email,
      exchange: b.exchange,
      walletType: b.walletType,
      total: b.total,
      free: b.free,
      used: b.used,
      usdValue: b.usdValue,
      loading: !!b.priceLoading,
    });
    holdingsMap.set(b.currency, e);
  });
  const holdings = Array.from(holdingsMap.values())
    .map(h => ({
      ...h,
      percentage: totalUsd > 0 ? (h.usdValue / totalUsd) * 100 : 0,
      // Share within the asset — USD when priced, otherwise raw amount so the
      // ratio still reads correctly for unpriced coins.
      sources: h.sources
        .map(s => ({
          ...s,
          share: h.usdValue > 0
            ? ((s.usdValue || 0) / h.usdValue) * 100
            : h.total > 0 ? (s.total / h.total) * 100 : 0,
        }))
        .sort((a, b) => b.share - a.share || b.total - a.total),
    }))
    .sort((a, b) => b.usdValue - a.usdValue)
    .map((h, i) => ({ ...h, color: PIE_COLORS[i % PIE_COLORS.length] }));
  // One slice per asset (aggregated across accounts/wallets), priced only.
  const pieData = holdings.filter(h => h.usdValue > 0);

  const anyLoading = flat.some(b => b.priceLoading);

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">Not signed in</h3>
        <p className="text-terminal-muted">Sign in with your MarketMaker account to view your portfolio</p>
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Wallet className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No exchange accounts</h3>
        <p className="text-terminal-muted">Add an exchange account (Accounts panel) to view your portfolio</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-medium text-terminal-text">Portfolio</h3>
          <p className="text-xs text-terminal-muted">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh balances"
          className="p-2 rounded hover:bg-terminal-accent/50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`text-terminal-muted ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-terminal-accent/20 p-3 rounded-md">
          <div className="text-xs text-terminal-muted mb-1">Total Value</div>
          <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            {anyLoading && totalUsd === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : `$${fmtUsd(totalUsd)}`}
          </div>
        </div>
        <div className="bg-terminal-accent/20 p-3 rounded-md">
          <div className="text-xs text-terminal-muted mb-1">Assets</div>
          <div className="text-xl font-semibold text-terminal-text">{holdings.length}</div>
        </div>
        <div className="bg-terminal-accent/20 p-3 rounded-md">
          <div className="text-xs text-terminal-muted mb-1">Accounts</div>
          <div className="text-xl font-semibold text-terminal-text">{accounts.length}</div>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-terminal-muted">
          {anyLoading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Loading balances…</p>
            </>
          ) : (
            <>
              <Wallet className="h-8 w-8 mb-2 text-terminal-text/60" />
              <p className="text-sm">No balances to show</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Allocation donut — one slice per asset; the table below is the legend */}
          {pieData.length > 0 && (
            <div className="h-40 mb-3 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="usdValue"
                    nameKey="currency"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {pieData.map((h) => (
                      <Cell key={h.currency} fill={h.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(24,24,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#ece8e1' }}
                    formatter={(value: any, _n: any, p: any) => [
                      `$${fmtUsd(Number(value))} · ${(p?.payload?.percentage ?? 0).toFixed(1)}%`,
                      p?.payload?.currency,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-asset breakdown */}
          <div className="flex-grow overflow-auto">
            <div className="flex items-center py-2 px-2 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
              <div className="flex-1">Asset</div>
              <div className="text-right flex-1">Amount</div>
              <div className="text-right flex-1">Value</div>
              <div className="text-right w-28">Allocation</div>
            </div>
            {holdings.map((h) => {
              const isOpen = expanded.has(h.currency);
              return (
                <div key={h.currency}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(h.currency)}
                    aria-expanded={isOpen}
                    title={`${h.sources.length} account${h.sources.length === 1 ? '' : 's'} hold ${h.currency}`}
                    className="w-full flex items-center py-2 px-2 text-sm text-left border-b border-terminal-border/20 hover:bg-terminal-accent/10"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChevronRight
                        size={14}
                        className={`shrink-0 text-terminal-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      />
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                      <div className="w-6 h-6 rounded-full bg-terminal-accent/40 flex items-center justify-center text-[10px] font-medium shrink-0">
                        {h.currency.slice(0, 3)}
                      </div>
                      <span className="font-medium text-terminal-text truncate">{h.currency}</span>
                      <span className="text-[10px] text-terminal-muted shrink-0">{h.sources.length}×</span>
                    </div>
                    <div className="text-right flex-1 text-terminal-text truncate">{fmtAmount(h.total)}</div>
                    <div className="text-right flex-1 text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      {h.loading && !h.usdValue ? <Loader2 className="h-3 w-3 animate-spin" /> : h.usdValue ? `$${fmtUsd(h.usdValue)}` : '-'}
                    </div>
                    <div className="w-28 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow h-1.5 rounded-full bg-terminal-border/40 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.percentage)}%`, backgroundColor: h.color }} />
                        </div>
                        <span className="text-xs text-terminal-muted w-10 text-right">{h.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </button>

                  {/* Accordion body — which accounts hold this asset, and in what ratio */}
                  {isOpen && (
                    <div className="bg-terminal-background/40 border-b border-terminal-border/20">
                      {h.sources.map(s => (
                        <div
                          key={s.key}
                          className="flex items-center py-1.5 px-2 text-xs hover:bg-terminal-accent/10"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0 pl-6">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60"
                              style={{ backgroundColor: h.color }}
                            />
                            <span className="text-terminal-text truncate">{s.label}</span>
                            <span className="text-terminal-muted shrink-0">{s.exchange}</span>
                            <span className="px-1 rounded bg-terminal-accent/40 text-terminal-muted text-[10px] shrink-0">
                              {s.walletType}
                            </span>
                          </div>
                          <div className="text-right flex-1 text-terminal-text truncate" title={s.used > 0 ? `free ${fmtAmount(s.free)} · in orders ${fmtAmount(s.used)}` : undefined}>
                            {fmtAmount(s.total)}
                            {s.used > 0 && <span className="text-terminal-muted"> ({fmtAmount(s.used)} used)</span>}
                          </div>
                          <div className="text-right flex-1 text-terminal-muted flex items-center justify-end gap-1">
                            {s.loading && !s.usdValue ? <Loader2 className="h-3 w-3 animate-spin" /> : s.usdValue ? `$${fmtUsd(s.usdValue)}` : '-'}
                          </div>
                          <div className="w-28 pl-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-grow h-1 rounded-full bg-terminal-border/40 overflow-hidden">
                                <div
                                  className="h-full rounded-full opacity-70"
                                  style={{ width: `${Math.min(100, s.share ?? 0)}%`, backgroundColor: h.color }}
                                />
                              </div>
                              <span className="text-[10px] text-terminal-muted w-10 text-right">{(s.share ?? 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioWidget;
