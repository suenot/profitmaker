import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useUserStore } from '../../store/userStore';
import { Group } from '../../types/groups';
import InstrumentSearch, { Instrument } from './InstrumentSearch';

interface GroupSelectorProps {
  selectedGroupId?: string;
  onGroupSelect: (groupId: string | undefined) => void;
  className?: string;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  selectedGroupId,
  onGroupSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const { 
    groups, 
    getGroupById, 
    getTransparentGroup,
    initializeDefaultGroups,
    setTradingPair,
    setAccount,
    setExchange,
    setMarket,
    resetGroup
  } = useGroupStore();

  // User store for getting account data
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  const firstAccount = activeUser?.accounts[0];

  // Initialize default groups on first render. Identities and accounts now come
  // from the central-accounts model (SSO sessions + GET /api/accounts), so there
  // is no demo-user seed here anymore.
  React.useEffect(() => {
    initializeDefaultGroups();
  }, [initializeDefaultGroups]);

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  // Initialize selected instrument based on user and group data
  React.useEffect(() => {
    if (selectedGroup && selectedGroup.account && selectedGroup.exchange && selectedGroup.market && selectedGroup.tradingPair) {
      // If group has all instrument data, set it (only if it's different to avoid loops)
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
    } else if (!selectedGroup && firstAccount && !selectedInstrument) {
      // If no group selected and no instrument set yet, set default from first
      // account. `account` binds to the central credential id (group.account).
      setSelectedInstrument({
        account: firstAccount.id,
        exchange: firstAccount.exchange,
        market: 'spot',
        pair: 'BTC/USDT'
      });
    }
    // Note: removed the else case that was setting null, as it was clearing valid selections
  }, [firstAccount, selectedGroup]); // Removed activeUser to avoid unnecessary re-runs

  // Instrument change handler with store synchronization
  const handleInstrumentChange = (instrument: Instrument | null) => {
    setSelectedInstrument(instrument);
    // Only update group if user explicitly changed the instrument AND it's actually different
    if (selectedGroup && instrument) {
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
    }
  };

  const handleGroupSelect = (group: Group | null) => {
    onGroupSelect(group?.id);
    setIsOpen(false);
  };

  // Function to get color name in English
  const getColorName = (color: string) => {
    const colorMap: Record<string, string> = {
      'transparent': 'Transparent',
      '#00BCD4': 'Cyan',
      '#F44336': 'Red',
      '#9C27B0': 'Purple',
      '#2196F3': 'Blue',
      '#4CAF50': 'Green',
      '#FF9800': 'Orange',
      '#E91E63': 'Pink',
    };
    return colorMap[color] || 'Unknown';
  };

  // Function to reset group
  const handleResetGroup = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation(); // prevent group selection when clicking on cross
    resetGroup(groupId);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Selector button */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setButtonPosition({
              x: rect.left,
              y: rect.bottom + window.scrollY
            });
            setIsOpen(!isOpen);
          }}
          className="w-4 h-4 rounded-full border border-terminal-border hover:border-terminal-accent transition-colors flex items-center justify-center"
          style={{
            backgroundColor: selectedGroup ? selectedGroup.color : 'transparent',
            borderColor: selectedGroup ? selectedGroup.color : undefined,
          }}
          title={selectedGroup ? `Group: ${selectedGroup.name}` : 'Select group'}
        >
          {(!selectedGroup || selectedGroup?.color === 'transparent') && (
            <Plus size={8} className="text-terminal-muted" />
          )}
        </button>
      </div>

      {/* Portal for popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              {/* Super instrument search input */}
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <InstrumentSearch
                    value={selectedInstrument}
                    onChange={handleInstrumentChange}
                    placeholder="Search account | exchange | market | pair..."
                    className="w-full"
                  />
                  {/* Cross for group reset - only if group is selected */}
                  {selectedGroup && (
                    <button
                      onClick={() => {
                        const transparentGroup = getTransparentGroup();
                        handleGroupSelect(transparentGroup || null);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-terminal-accent/20 transition-colors z-10"
                      title="Switch to transparent group"
                    >
                      <X size={12} className="text-terminal-muted hover:text-terminal-text" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Group list */}
              <div className="max-h-72 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`group w-full flex items-start px-3 py-3 text-sm rounded hover:bg-terminal-accent/20 cursor-pointer relative ${
                      selectedGroupId === group.id ? 'bg-terminal-accent/30' : ''
                    }`}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0 border mt-0.5"
                      style={{ 
                        backgroundColor: group.color === 'transparent' ? 'transparent' : group.color,
                        borderColor: group.color === 'transparent' ? 'hsl(var(--terminal-border))' : group.color
                      }}
                    />
                    <div className="text-left flex-1">
                      {group.account || group.exchange || group.market || group.tradingPair ? (
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0" title="Configured" />
                            <span className="text-terminal-text font-medium">
                              {getColorName(group.color)} - Configured
                            </span>
                          </div>
                          <div className="text-xs text-terminal-muted pl-4">
                            {group.account && <span className="mr-2">{group.account}</span>}
                            {group.exchange && <span className="mr-2">• {group.exchange}</span>}
                            {group.market && <span className="mr-2">• {group.market}</span>}
                            {group.tradingPair && <span>• {group.tradingPair}</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-terminal-muted">
                          {getColorName(group.color)}
                        </span>
                      )}
                    </div>
                    {/* Cross for group reset - shown on hover, hidden for transparent group */}
                    {group.color !== 'transparent' && (
                      <button
                        onClick={(e) => handleResetGroup(e, group.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-terminal-accent/30 transition-opacity"
                        title="Reset group settings"
                      >
                        <X size={12} className="text-terminal-muted hover:text-terminal-text" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default GroupSelector; 