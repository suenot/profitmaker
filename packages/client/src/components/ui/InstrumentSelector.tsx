import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import InstrumentSearch, { Instrument } from './InstrumentSearch';
import {
  getStoredInstrumentAccount,
  PUBLIC_INSTRUMENT_ACCOUNT,
  toGroupInstrumentSelection,
} from '../../utils/instrumentSearch';

interface InstrumentSelectorProps {
  selectedGroupId?: string;
  className?: string;
  placeholder?: string;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  selectedGroupId,
  className = '',
  placeholder = "Search account | exchange | market | pair..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  
  const { 
    getGroupById,
    setInstrument,
  } = useGroupStore();

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  // Initialize selected instrument based on group data
  React.useEffect(() => {
    if (selectedGroup && selectedGroup.exchange && selectedGroup.market && selectedGroup.tradingPair) {
      const currentInstrument = {
        account: selectedGroup.account || PUBLIC_INSTRUMENT_ACCOUNT,
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
    }
  }, [selectedGroup]);

  const handleInstrumentChange = (instrument: Instrument | null) => {
    setSelectedInstrument(instrument);
    // Update group data if group is selected and instrument changed
    if (selectedGroup && instrument) {
      const hasChanges = 
        selectedGroup.account !== getStoredInstrumentAccount(instrument.account) ||
        selectedGroup.exchange !== instrument.exchange ||
        selectedGroup.market !== instrument.market ||
        selectedGroup.tradingPair !== instrument.pair;
      
      if (hasChanges) {
        setInstrument(selectedGroup.id, toGroupInstrumentSelection(instrument));
      }
    }
  };

  const getDisplayText = () => {
    if (selectedInstrument) {
      return `${selectedInstrument.account} | ${selectedInstrument.exchange} | ${selectedInstrument.market} | ${selectedInstrument.pair}`;
    }
    return placeholder;
  };

  const handleClear = () => {
    setSelectedInstrument(null);
    if (selectedGroup) {
      setInstrument(selectedGroup.id, {
        account: undefined,
        exchange: undefined,
        market: undefined,
        tradingPair: undefined,
      });
    }
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Instrument selector button */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setButtonPosition({
              x: rect.left,
              y: rect.bottom + window.scrollY
            });
            setIsOpen(!isOpen);
          }}
          className="w-full flex items-center bg-terminal-accent/30 border border-terminal-border rounded-md py-2 pl-10 pr-3 text-sm hover:border-terminal-accent transition-colors text-left"
        >
          <Search size={16} className="absolute left-3 text-terminal-muted" />
          <span className={`flex-1 truncate ${selectedInstrument ? 'text-terminal-text' : 'text-terminal-muted'}`}>
            {getDisplayText()}
          </span>
          {selectedInstrument && (
            <X 
              size={16} 
              className="text-terminal-muted hover:text-terminal-text ml-2 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </button>
      </div>

      {/* Portal for instrument search popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Instrument search popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              <div className="text-sm text-terminal-muted mb-3">Select trading instrument:</div>
              
              {/* Instrument search */}
              <InstrumentSearch
                value={selectedInstrument}
                onChange={(instrument) => {
                  handleInstrumentChange(instrument);
                  setIsOpen(false);
                }}
                placeholder={placeholder}
                className="w-full"
              />

              {/* Current selection display */}
              {selectedInstrument && (
                <div className="mt-3 pt-3 border-t border-terminal-border">
                  <div className="text-xs text-terminal-muted mb-1">Current selection:</div>
                  <div className="text-sm text-terminal-text">
                    {getDisplayText()}
                  </div>
                  <button
                    onClick={handleClear}
                    className="mt-2 text-xs text-terminal-muted hover:text-terminal-text"
                  >
                    Clear selection
                  </button>
                </div>
              )}

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

export default InstrumentSelector;
