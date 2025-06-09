import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { GroupColors } from '../../types/groups';
import PlusCircleIcon from './PlusCircleIcon';

interface GroupColorSelectorProps {
  selectedGroupId?: string;
  onGroupSelect: (groupId: string | undefined) => void;
  className?: string;
}

const GroupColorSelector: React.FC<GroupColorSelectorProps> = ({
  selectedGroupId,
  onGroupSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const { 
    groups, 
    getGroupById, 
    getTransparentGroup,
    initializeDefaultGroups
  } = useGroupStore();

  // Initialize groups on first render
  React.useEffect(() => {
    initializeDefaultGroups();
  }, [initializeDefaultGroups]);

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  const handleGroupSelect = (groupId: string | undefined) => {
    onGroupSelect(groupId);
    setIsOpen(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If group is selected (has color), switch to transparent group
    if (selectedGroup && selectedGroup.color !== 'transparent') {
      const transparentGroup = getTransparentGroup();
      onGroupSelect(transparentGroup?.id);
      return;
    }
    
    // If no group or transparent group, open color picker
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setIsOpen(!isOpen);
  };

  const isGroupSelected = selectedGroup && selectedGroup.color !== 'transparent';
  const showClearIcon = isGroupSelected && isHovered;

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

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Color selector button */}
        {(!selectedGroup || selectedGroup?.color === 'transparent') ? (
          /* Transparent group - show PlusCircleIcon */
          <button
            onClick={handleButtonClick}
            className="flex items-center justify-center transition-opacity hover:opacity-80 text-terminal-muted hover:text-terminal-text"
            title="Select group color"
          >
            <PlusCircleIcon />
          </button>
        ) : (
          /* Colored group - show colored circle with X on hover */
          <button
            onClick={handleButtonClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-3 h-3 rounded-full border transition-colors flex items-center justify-center relative"
            style={{
              backgroundColor: selectedGroup.color,
              borderColor: selectedGroup.color,
            }}
            title={`Group: ${selectedGroup.name} (click to clear)`}
          >
            {/* Show X icon on hover for selected groups */}
            {showClearIcon && (
              <X size={6} className="text-white drop-shadow-sm" />
            )}
          </button>
        )}
      </div>

      {/* Portal for color palette popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
                    {/* Group list popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              {/* Group list */}
              <div className="max-h-72 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`group w-full flex items-center px-3 py-2 text-sm rounded hover:bg-terminal-accent/20 cursor-pointer relative ${
                      selectedGroupId === group.id ? 'bg-terminal-accent/30' : ''
                    }`}
                    onClick={() => handleGroupSelect(group.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border"
                      style={{ 
                        backgroundColor: group.color === 'transparent' ? 'hsl(var(--terminal-border))' : group.color,
                        borderColor: group.color === 'transparent' ? 'hsl(var(--terminal-border))' : group.color
                      }}
                    />
                    <span className="text-left flex-1">
                      {getColorName(group.color)}
                    </span>
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

export default GroupColorSelector; 