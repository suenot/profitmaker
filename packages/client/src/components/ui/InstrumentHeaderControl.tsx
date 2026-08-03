import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useUserStore } from '../../store/userStore';
import { useDataProviderStore } from '../../store/dataProviderStore';

export interface Instrument {
  account: string;
  /** Human-readable account identity for search and selection display. */
  accountLabel?: string;
  exchange: string;
  market: string;
  pair: string;
}

interface InstrumentHeaderControlProps {
  selectedGroupId?: string;
  className?: string;
}

const InstrumentHeaderControl: React.FC<InstrumentHeaderControlProps> = ({
  selectedGroupId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [exchangeData, setExchangeData] = useState<Record<string, { symbols: string[]; markets: string[] }>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    getGroupById,
    setTradingPair,
    setAccount,
    setExchange,
    setMarket
  } = useGroupStore();

  const { users, activeUserId } = useUserStore();
  const { getSymbolsForExchange, getMarketsForExchange } = useDataProviderStore();
  const activeUser = users.find(u => u.id === activeUserId);

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  // Load exchange data when activeUser changes
  useEffect(() => {
    if (!activeUser) return;

    const loadExchangeData = async () => {
      const newExchangeData: Record<string, { symbols: string[]; markets: string[] }> = {};
      
      for (const account of activeUser.accounts) {
        if (!newExchangeData[account.exchange]) {
          try {
            const [symbols, markets] = await Promise.all([
              getSymbolsForExchange(account.exchange, undefined, 'spot'),
              getMarketsForExchange(account.exchange)
            ]);
            
            newExchangeData[account.exchange] = { symbols, markets };
          } catch (error) {
            console.error(`Failed to load data for ${account.exchange}:`, error);
            newExchangeData[account.exchange] = {
              symbols: ['BTC/USDT', 'ETH/USDT'],
              markets: ['spot']
            };
          }
        }
      }
      
      setExchangeData(newExchangeData);
    };

    loadExchangeData();
  }, [activeUser, getSymbolsForExchange, getMarketsForExchange]);

  // Generate all possible instruments from user accounts
  const allInstruments = useMemo((): Instrument[] => {
    if (!activeUser) return [];
    
    const instruments: Instrument[] = [];

    activeUser.accounts.forEach(account => {
      const exchangeInfo = exchangeData[account.exchange];
      if (!exchangeInfo) return;
      
      const { symbols, markets } = exchangeInfo;
      
      markets.forEach(market => {
        symbols.forEach(pair => {
          const instrument: Instrument = {
            account: account.id,
            accountLabel: account.label || account.email || account.exchange,
            exchange: account.exchange,
            market,
            pair
          };
          instruments.push(instrument);
        });
      });
    });

    return instruments;
  }, [activeUser, exchangeData]);

  // Smart multi-word search with current selection at top
  const { filteredInstruments, totalFound } = useMemo(() => {
    let baseInstruments = allInstruments;
    
    // Filter by search query if present
    if (searchQuery.trim()) {
      const searchWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
      
      if (searchWords.length > 0) {
        baseInstruments = allInstruments.filter(instrument => 
          searchWords.every(word =>
            (instrument.accountLabel || instrument.account).toLowerCase().includes(word) ||
            instrument.exchange.toLowerCase().includes(word) ||
            instrument.market.toLowerCase().includes(word) ||
            instrument.pair.toLowerCase().includes(word)
          )
        );
      }
    }

    // Put current selection at the top if it exists and matches search
    let finalInstruments = baseInstruments;
    if (selectedInstrument) {
      const isCurrentInResults = baseInstruments.some(inst => 
        inst.account === selectedInstrument.account &&
        inst.exchange === selectedInstrument.exchange &&
        inst.market === selectedInstrument.market &&
        inst.pair === selectedInstrument.pair
      );

      if (isCurrentInResults) {
        // Remove current from list and add to top
        finalInstruments = [
          selectedInstrument,
          ...baseInstruments.filter(inst => 
            !(inst.account === selectedInstrument.account &&
              inst.exchange === selectedInstrument.exchange &&
              inst.market === selectedInstrument.market &&
              inst.pair === selectedInstrument.pair)
          )
        ];
      }
    }

    return { 
      filteredInstruments: finalInstruments.slice(0, 200), 
      totalFound: baseInstruments.length 
    };
  }, [allInstruments, searchQuery, selectedInstrument]);

  // Initialize selected instrument based on group data
  React.useEffect(() => {
    if (selectedGroup && selectedGroup.account && selectedGroup.exchange && selectedGroup.market && selectedGroup.tradingPair) {
      const currentInstrument = {
        account: selectedGroup.account,
        exchange: selectedGroup.exchange,
        market: selectedGroup.market,
        pair: selectedGroup.tradingPair
      };
      
      setSelectedInstrument(prev => {
        // Only update if the data is actually different
        if (!prev || 
            prev.account !== currentInstrument.account ||
            prev.exchange !== currentInstrument.exchange ||
            prev.market !== currentInstrument.market ||
            prev.pair !== currentInstrument.pair) {
          return currentInstrument;
        }
        return prev;
      });
    } else {
      // Clear if group doesn't have complete instrument data
      setSelectedInstrument(null);
    }
  }, [selectedGroup]);

  const handleInstrumentChange = (instrument: Instrument | null) => {
    setSelectedInstrument(instrument);
    
    if (selectedGroup) {
      if (instrument) {
        // Update group data if instrument is selected
        const hasChanges = 
          selectedGroup.account !== instrument.account ||
          selectedGroup.exchange !== instrument.exchange ||
          selectedGroup.market !== instrument.market ||
          selectedGroup.tradingPair !== instrument.pair;
        
        if (hasChanges) {
          setAccount(selectedGroup.id, instrument.account);
          setExchange(selectedGroup.id, instrument.exchange);
          setMarket(selectedGroup.id, instrument.market);
          setTradingPair(selectedGroup.id, instrument.pair);
        }
      } else {
        // Clear group data if instrument is cleared
        setAccount(selectedGroup.id, '');
        setExchange(selectedGroup.id, '');
        setMarket(selectedGroup.id, '');
        setTradingPair(selectedGroup.id, '');
      }
    }
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setIsOpen(!isOpen);
    setSearchQuery('');
    setHighlightedIndex(0);
    
    // Focus search input when opening
    if (!isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleInstrumentSelect = (instrument: Instrument | null) => {
    handleInstrumentChange(instrument);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  };

  return (
    <>
      <div className={`flex items-center ${className}`}>
        {/* Unified search button with icon and pair */}
        <button
          onClick={handleSearchClick}
          className="flex items-center space-x-2 px-1 py-1 rounded-sm hover:bg-terminal-widget/50 transition-colors flex-shrink-0"
          title="Search trading instrument"
        >
          <Search size={14} className="text-terminal-muted hover:text-terminal-text transition-colors flex-shrink-0" />
          
          {/* Display pair if instrument is selected */}
          {selectedInstrument && (
            <span className="text-xs font-medium text-terminal-text truncate">
              {selectedInstrument.pair}
            </span>
          )}
        </button>
      </div>

      {/* Portal for direct instruments list popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Direct instruments list popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              {/* Search input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Search account | exchange | market | pair..."
                  className="w-full pl-10 pr-10 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setHighlightedIndex(0);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-terminal-accent/20 transition-colors"
                  >
                    <X size={12} className="text-terminal-muted hover:text-terminal-text" />
                  </button>
                )}
              </div>

              {/* Instruments list */}
              <VirtualizedInstrumentsList
                instruments={filteredInstruments}
                totalFound={totalFound}
                highlightedIndex={highlightedIndex}
                onSelect={handleInstrumentSelect}
                selectedInstrument={selectedInstrument}
              />

              {/* Help text */}
              {!selectedGroup && (
                <div className="mt-3 pt-3 border-t border-terminal-border text-xs text-terminal-muted">
                  💡 Select a group color first to save instrument settings
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// Virtualized instruments list component
const VirtualizedInstrumentsList: React.FC<{
  instruments: Instrument[];
  totalFound: number;
  highlightedIndex: number;
  onSelect: (instrument: Instrument | null) => void;
  selectedInstrument: Instrument | null;
}> = ({ instruments, totalFound, highlightedIndex, onSelect, selectedInstrument }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: instruments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  if (instruments.length === 0) {
    return (
      <div className="py-4 text-sm text-terminal-muted text-center">
        No instruments found
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-hidden">
      <div
        ref={parentRef}
        className="h-72 overflow-auto" 
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const instrument = instruments[virtualRow.index];
            const isHighlighted = virtualRow.index === highlightedIndex;
            const isCurrentSelection = selectedInstrument &&
              instrument.account === selectedInstrument.account &&
              instrument.exchange === selectedInstrument.exchange &&
              instrument.market === selectedInstrument.market &&
              instrument.pair === selectedInstrument.pair;
            
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
                <div
                  onClick={() => onSelect(instrument)}
                  className={`px-3 py-3 cursor-pointer border-b border-terminal-border/50 last:border-b-0 ${
                    isCurrentSelection
                      ? 'bg-terminal-accent/30 border-l-2 border-l-green-400 pl-2'
                      : isHighlighted 
                        ? 'bg-terminal-accent/20' 
                        : 'hover:bg-terminal-accent/10'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {isCurrentSelection && (
                      <div className="flex items-center justify-between text-xs text-green-400 font-medium mb-1">
                        <span>✓ Current Selection</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(null);
                          }}
                          className="p-1 rounded-sm hover:bg-terminal-widget/50 text-terminal-muted hover:text-terminal-negative transition-colors ml-2"
                          title="Clear selection"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <div className="text-terminal-text font-medium">
                      <span className="text-terminal-muted">Account:</span> {instrument.accountLabel || instrument.account}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Exchange:</span> {instrument.exchange}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Market:</span> {instrument.market}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Pair:</span> {instrument.pair}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Results counter footer */}
      <div className="px-3 py-2 border-t border-terminal-border/50 bg-terminal-bg/50">
        <div className="text-xs text-terminal-muted text-center">
          Showing <span className="text-slate-600 dark:text-slate-300 font-medium">{instruments.length}</span> of <span className="text-slate-600 dark:text-slate-300 font-medium">{totalFound}</span> instruments
        </div>
      </div>
    </div>
  );
};

export default InstrumentHeaderControl;
