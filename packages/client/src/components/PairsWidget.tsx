import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';
import { useGroupStore } from '../store/groupStore';
import { ChevronDown, User, ArrowUpDown, TrendingUp, Search, AlertTriangle, RefreshCw } from 'lucide-react';

export const PairsWidget: React.FC = () => {
  const { getSymbolsForExchange, getMarketsForExchange, getAllSupportedExchanges } = useDataProviderStore();
  const { users, activeUserId } = useUserStore();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hasUserMadeChoice, setHasUserMadeChoice] = useState(false); // Track explicit user choice
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  // Distinct from "loaded but empty" — a failed fetch must not render as an
  // exchange/market pair that legitimately lists no symbols.
  const [error, setError] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

  // Row selection writes into the active group (transparent group when none is
  // explicitly selected), so the chart and order book follow the choice.
  const selectedGroupId = useGroupStore((s) => s.selectedGroupId);
  const getTransparentGroup = useGroupStore((s) => s.getTransparentGroup);
  const setInstrument = useGroupStore((s) => s.setInstrument);
  const groups = useGroupStore((s) => s.groups);

  const targetGroup = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId) ?? getTransparentGroup()
    : getTransparentGroup();

  // Ref for handling clicks outside
  const widgetRef = useRef<HTMLDivElement>(null);

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setIsAccountDropdownOpen(false);
    setIsExchangeDropdownOpen(false);
    setIsMarketDropdownOpen(false);
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
  }, [selectedAccountId, selectedExchange, availableAccounts]);

  // Load markets when exchange changes
  useEffect(() => {
    if (!selectedExchange) return;

    const loadMarkets = async () => {
      try {
        const markets = await getMarketsForExchange(selectedExchange);
        setAvailableMarkets(markets);
        if (markets.length > 0 && !selectedMarket) {
          setSelectedMarket(markets[0]);
        }
      } catch (error) {
        console.error('Failed to load markets:', error);
        setAvailableMarkets([]);
      }
    };

    loadMarkets();
  }, [selectedExchange, getMarketsForExchange, selectedMarket]);

  // Load pairs when exchange + market changes
  const loadPairs = useCallback(async () => {
    if (!selectedExchange || !selectedMarket) return;

    setLoading(true);
    setError(null);
    try {
      const pairs = await getSymbolsForExchange(selectedExchange, undefined, selectedMarket);
      setAvailablePairs(pairs);
    } catch (err) {
      console.error('Failed to load pairs:', err);
      setAvailablePairs([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, selectedMarket, getSymbolsForExchange]);

  useEffect(() => {
    void loadPairs();
  }, [loadPairs]);

  // A pair is the only row here that carries a full instrument, so selecting one
  // writes the whole tuple the trading widgets read.
  const handleSelectPair = useCallback((pair: string) => {
    if (!targetGroup || !selectedExchange || !selectedMarket) return;
    setInstrument(targetGroup.id, {
      exchange: selectedExchange,
      market: selectedMarket,
      tradingPair: pair,
      // Only set the account when the user picked one; leaving it undefined
      // keeps public widgets working without claiming a private account.
      ...(selectedAccountId ? { account: selectedAccountId } : {}),
    });
  }, [targetGroup, setInstrument, selectedExchange, selectedMarket, selectedAccountId]);

  // Filter pairs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPairs(availablePairs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = availablePairs.filter(pair => 
        pair.toLowerCase().includes(query)
      );
      setFilteredPairs(filtered);
    }
  }, [availablePairs, searchQuery]);

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
                    setSelectedMarket(null);
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

      {/* Market Selection */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Market
        </label>
        <div className="relative">
          <button
            onClick={() => {
              closeAllDropdowns();
              setIsMarketDropdownOpen(!isMarketDropdownOpen);
            }}
            disabled={!selectedExchange}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-terminal-text/80" />
              <span>{selectedMarket || 'Select market...'}</span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isMarketDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableMarkets.map((market) => (
                <button
                  key={market}
                  onClick={() => {
                    setSelectedMarket(market);
                    setIsMarketDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <TrendingUp size={16} className="text-terminal-text/70" />
                  <span>{market}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Search Pairs
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
          <input
            type="text"
            placeholder="Filter pairs (e.g., BTC, ETH, USDT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          />
        </div>
      </div>

      {/* Pairs List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-terminal-text">
            Trading Pairs
          </h3>
          <span className="text-xs text-terminal-muted">
            {filteredPairs.length} of {availablePairs.length} pairs
          </span>
        </div>

        {!selectedExchange || !selectedMarket ? (
          <div className="bg-terminal-bg border border-terminal-border rounded p-4 text-center text-terminal-muted text-sm">
            Please select exchange and market to view pairs
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-terminal-muted">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-accent"></div>
            <span className="ml-2 text-sm">Loading pairs...</span>
          </div>
        ) : error ? (
          <div className="bg-terminal-bg border border-terminal-negative/40 rounded p-4 text-sm">
            <div className="flex items-center gap-2 text-terminal-negative font-medium mb-1">
              <AlertTriangle size={16} /> Could not load pairs for {selectedExchange}/{selectedMarket}
            </div>
            <p className="text-terminal-muted text-xs mb-3">{error}</p>
            <button
              onClick={() => void loadPairs()}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-terminal-border text-xs text-terminal-text hover:bg-terminal-accent/20 transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <VirtualizedPairsList
            pairs={filteredPairs}
            searchQuery={searchQuery}
            selectedExchange={selectedExchange}
            selectedMarket={selectedMarket}
            selectedPair={
              targetGroup?.exchange === selectedExchange && targetGroup?.market === selectedMarket
                ? targetGroup?.tradingPair
                : undefined
            }
            onSelect={handleSelectPair}
          />
        )}
      </div>

      {/* Selection Info */}
      <div className="bg-terminal-widget/50 border border-terminal-border/50 rounded p-3">
        <div className="text-xs text-terminal-muted space-y-1">
          <div><strong>Account:</strong> {selectedAccount?.email || 'None selected'}</div>
          <div><strong>Exchange:</strong> {selectedExchange || 'None selected'}</div>
          <div><strong>Market:</strong> {selectedMarket || 'None selected'}</div>
          <div><strong>Total Pairs:</strong> {availablePairs.length}</div>
          <div><strong>Filtered Pairs:</strong> {filteredPairs.length}</div>
          {searchQuery && (
            <div><strong>Search:</strong> "{searchQuery}"</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Virtualized pairs list component
const VirtualizedPairsList: React.FC<{
  pairs: string[];
  searchQuery: string;
  selectedExchange: string | null;
  selectedMarket: string | null;
  selectedPair?: string;
  onSelect: (pair: string) => void;
}> = ({ pairs, searchQuery, selectedExchange, selectedMarket, selectedPair, onSelect }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Fixed height for each pair item
    overscan: 10, // Render 10 extra items outside visible area
  });

  if (pairs.length === 0) {
    return (
      <div className="bg-terminal-bg border border-terminal-border rounded max-h-80">
        <div className="p-4 text-center text-terminal-muted text-sm">
          {searchQuery ? `No pairs found for "${searchQuery}"` : `No pairs available for ${selectedExchange}/${selectedMarket}`}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-bg border border-terminal-border rounded max-h-80 overflow-hidden">
      <div
        ref={parentRef}
        className="h-80 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          role="listbox"
          aria-label="Trading pairs"
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const pair = pairs[virtualRow.index];
            // Parse pair to extract base and quote
            const parts = pair.split('/');
            const base = parts[0] || '';
            const quote = parts[1] || '';
            const isSelected = pair === selectedPair;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* A real <button> so Enter/Space activation and focus come from
                    the platform rather than hand-rolled key handlers. */}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(pair)}
                  title={`Use ${selectedExchange} ${selectedMarket} ${pair} for the active group`}
                  className={`w-full text-left px-3 py-2 transition-colors border-b border-terminal-border/50 last:border-b-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-terminal-accent ${
                    isSelected ? 'bg-terminal-accent/30' : 'hover:bg-terminal-accent/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-terminal-text font-medium">{pair}</span>
                      <div className="text-xs text-terminal-muted">
                        {base && quote ? `${base} to ${quote}` : 'Trading pair'}
                      </div>
                    </div>
                    <span className="text-xs text-terminal-muted">#{virtualRow.index + 1}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 