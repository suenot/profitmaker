import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';
import { useGroupStore } from '../store/groupStore';
import { ChevronDown, User, ArrowUpDown, AlertTriangle, RefreshCw } from 'lucide-react';

export const MarketsWidget: React.FC = () => {
  const { getMarketsForExchange, getAllSupportedExchanges } = useDataProviderStore();
  const { users, activeUserId } = useUserStore();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hasUserMadeChoice, setHasUserMadeChoice] = useState(false); // Track explicit user choice
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Distinct from "loaded but empty" — a failed fetch must not render as an
  // exchange that legitimately offers no markets.
  const [error, setError] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);

  // Row selection writes into the active group (transparent group when none is
  // explicitly selected), so the chart and order book follow the choice.
  const selectedGroupId = useGroupStore((s) => s.selectedGroupId);
  const getTransparentGroup = useGroupStore((s) => s.getTransparentGroup);
  const setInstrument = useGroupStore((s) => s.setInstrument);
  const groups = useGroupStore((s) => s.groups);

  const targetGroup = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId) ?? getTransparentGroup()
    : getTransparentGroup();

  const handleSelectMarket = useCallback((market: string) => {
    if (!targetGroup) return;
    // The market only makes sense alongside the exchange it was listed for.
    setInstrument(targetGroup.id, {
      market,
      ...(selectedExchange ? { exchange: selectedExchange } : {}),
    });
  }, [targetGroup, setInstrument, selectedExchange]);

  // Ref for handling clicks outside
  const widgetRef = useRef<HTMLDivElement>(null);

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setIsAccountDropdownOpen(false);
    setIsExchangeDropdownOpen(false);
  };

  // Handle clicks outside to close all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeUser = users.find(u => u.id === activeUserId);
  const availableAccounts = activeUser?.accounts || [];
  
  // Get unique exchanges from user accounts OR all supported exchanges from providers if no account selected
  const availableExchanges = selectedAccountId 
    ? Array.from(new Set(availableAccounts.map(acc => acc.exchange))).sort()
    : getAllSupportedExchanges();

  // Auto-select first account if none selected (only if user hasn't made explicit choice)
  useEffect(() => {
    if (!hasUserMadeChoice && !selectedAccountId && availableAccounts.length > 0) {
      setSelectedAccountId(availableAccounts[0].id);
    }
  }, [selectedAccountId, availableAccounts, hasUserMadeChoice]);

  // Auto-select exchange from selected account
  useEffect(() => {
    if (selectedAccountId && !selectedExchange) {
      const account = availableAccounts.find(acc => acc.id === selectedAccountId);
      if (account) {
        setSelectedExchange(account.exchange);
      }
    }
    // If no account selected and no exchange selected, don't auto-select
  }, [selectedAccountId, selectedExchange, availableAccounts]);

  // Load markets when exchange changes
  const loadMarkets = useCallback(async () => {
    if (!selectedExchange) return;

    setLoading(true);
    setError(null);
    try {
      const markets = await getMarketsForExchange(selectedExchange);
      setAvailableMarkets(markets);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setAvailableMarkets([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, getMarketsForExchange]);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  const selectedAccount = selectedAccountId 
    ? availableAccounts.find(acc => acc.id === selectedAccountId) 
    : null;

  return (
    <div ref={widgetRef} className="h-full flex flex-col space-y-4">
      {/* Account Selection (Optional) */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Account (Optional)
        </label>
        <div className="relative">
          <button
            onClick={() => {
              closeAllDropdowns();
              setIsAccountDropdownOpen(!isAccountDropdownOpen);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          >
            <div className="flex items-center space-x-2">
              <User size={16} className="text-terminal-text/80" />
              <span>
                {selectedAccount?.email || 
                 (selectedAccountId === null ? 'No account (all exchanges)' : 'Select account...')}
              </span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isAccountDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedAccountId(null);
                  setHasUserMadeChoice(true); // Mark that user made explicit choice
                  // Don't reset exchange when switching to "No account"
                  setIsAccountDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm text-terminal-muted"
              >
                <User size={16} className="text-terminal-text/60" />
                <span>No account (all exchanges)</span>
              </button>
              {availableAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setHasUserMadeChoice(true); // Mark that user made explicit choice
                    setSelectedExchange(account.exchange);
                    setIsAccountDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <User size={16} className="text-terminal-text/70" />
                  <div>
                    <div className="font-medium">{account.email}</div>
                    <div className="text-xs text-terminal-muted">{account.exchange}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exchange Selection */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Exchange
        </label>
        <div className="relative">
          <button
            onClick={() => {
              closeAllDropdowns();
              setIsExchangeDropdownOpen(!isExchangeDropdownOpen);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          >
            <div className="flex items-center space-x-2">
              <ArrowUpDown size={16} className="text-terminal-text/80" />
              <span>{selectedExchange || 'Select exchange...'}</span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isExchangeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableExchanges.map((exchange) => (
                <button
                  key={exchange}
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setIsExchangeDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <ArrowUpDown size={16} className="text-terminal-text/70" />
                  <span>{exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Markets List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-terminal-text">
            Available Markets
          </h3>
          <span className="text-xs text-terminal-muted">
            {availableMarkets.length} markets
          </span>
        </div>

        {!selectedExchange ? (
          <div className="bg-terminal-bg border border-terminal-border rounded p-4 text-center text-terminal-muted text-sm">
            Please select an exchange to view markets
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-terminal-muted">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-accent"></div>
            <span className="ml-2 text-sm">Loading markets...</span>
          </div>
        ) : error ? (
          <div className="bg-terminal-bg border border-terminal-negative/40 rounded p-4 text-sm">
            <div className="flex items-center gap-2 text-terminal-negative font-medium mb-1">
              <AlertTriangle size={16} /> Could not load markets for {selectedExchange}
            </div>
            <p className="text-terminal-muted text-xs mb-3">{error}</p>
            <button
              onClick={() => void loadMarkets()}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-terminal-border text-xs text-terminal-text hover:bg-terminal-accent/20 transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <div className="bg-terminal-bg border border-terminal-border rounded max-h-80 overflow-y-auto">
            {availableMarkets.length === 0 ? (
              <div className="p-4 text-center text-terminal-muted text-sm">
                No markets available for {selectedExchange}
              </div>
            ) : (
              <div className="divide-y divide-terminal-border/50" role="listbox" aria-label="Available markets">
                {availableMarkets.map((market, index) => {
                  const isSelected = targetGroup?.market === market
                    && targetGroup?.exchange === selectedExchange;

                  return (
                    /* A real <button> so Enter/Space activation and focus come
                       from the platform rather than hand-rolled key handlers. */
                    <button
                      key={market}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectMarket(market)}
                      title={`Use ${selectedExchange} ${market} for the active group`}
                      className={`w-full text-left px-3 py-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-terminal-accent ${
                        isSelected ? 'bg-terminal-accent/30' : 'hover:bg-terminal-accent/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-terminal-text font-medium">{market}</span>
                          <div className="text-xs text-terminal-muted">
                            {market === 'spot' && 'Spot trading'}
                            {market === 'futures' && 'Futures contracts'}
                            {market === 'margin' && 'Margin trading'}
                            {market === 'options' && 'Options contracts'}
                            {market === 'inverse' && 'Inverse perpetual contracts'}
                            {market === 'swap' && 'Perpetual swap contracts'}
                            {market === 'advanced' && 'Advanced trading features'}
                            {!['spot', 'futures', 'margin', 'options', 'inverse', 'swap', 'advanced'].includes(market) && 'Market type'}
                          </div>
                        </div>
                        <span className="text-xs text-terminal-muted">#{index + 1}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection Info */}
      <div className="bg-terminal-widget/50 border border-terminal-border/50 rounded p-3">
        <div className="text-xs text-terminal-muted space-y-1">
          <div><strong>Account:</strong> {selectedAccount?.email || 'None selected'}</div>
          <div><strong>Exchange:</strong> {selectedExchange || 'None selected'}</div>
          <div><strong>Markets Count:</strong> {availableMarkets.length}</div>
          {selectedAccount && (
            <div><strong>Account Exchange:</strong> {selectedAccount.exchange}</div>
          )}
        </div>
      </div>
    </div>
  );
};