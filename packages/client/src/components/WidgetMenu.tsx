import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useGroupStore } from '@/store/groupStore';
import { Bug, ChevronRight } from 'lucide-react';
import { useWidgetRegistry } from '@/modules/registry';
import { resolveIcon } from '@/modules/resolveIcon';
import type { BuiltinWidgetDefinition } from '@/modules/builtinWidgets';

interface MenuWidgetItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface WidgetMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
}

interface SubmenuPosition {
  x: number;
  y: number;
  placement: 'right' | 'left' | 'bottom' | 'top';
}

const WidgetMenu: React.FC<WidgetMenuProps> = ({ position, onClose }) => {
  const addWidget = useDashboardStore(s => s.addWidget);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const getActiveDashboard = useDashboardStore(s => s.getActiveDashboard);
  const { getTransparentGroup } = useGroupStore();
  const definitions = useWidgetRegistry(s => s.definitions);
  const getDefinition = useWidgetRegistry(s => s.getDefinition);
  const listByCategory = useWidgetRegistry(s => s.listByCategory);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState<SubmenuPosition>({ x: 0, y: 0, placement: 'right' });
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const diagnosticsMenuRef = useRef<HTMLDivElement>(null);
  const diagnosticsButtonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging for widget menu
  React.useEffect(() => {
    console.log('WidgetMenu: Active dashboard changed', { activeDashboardId });
  }, [activeDashboardId]);
  
  // Smart positioning calculation
  const calculateSmartPosition = useCallback(() => {
    const MENU_WIDTH = 300;
    const SUBMENU_WIDTH = 280;
    const PADDING = 20;
    
    // Adjust main menu position to ensure it stays within viewport
    const adjustedMainPosition = {
      x: Math.min(position.x, window.innerWidth - MENU_WIDTH - PADDING),
      y: Math.min(position.y, window.innerHeight - 500)
    };
    
    setAdjustedPosition(adjustedMainPosition);
    
    // Calculate submenu position only if diagnostics menu is visible
    if (showDiagnostics && diagnosticsButtonRef.current && menuRef.current) {
      const buttonRect = diagnosticsButtonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      
      // Try positioning to the right first (default)
      let submenuX = adjustedMainPosition.x + MENU_WIDTH;
      let submenuY = buttonRect.top - menuRect.top + adjustedMainPosition.y;
      let placement: SubmenuPosition['placement'] = 'right';
      
      // Check if submenu would go off-screen to the right
      if (submenuX + SUBMENU_WIDTH > window.innerWidth - PADDING) {
        // Try positioning to the left
        submenuX = adjustedMainPosition.x - SUBMENU_WIDTH;
        placement = 'left';
        
        // If still off-screen to the left, position below
        if (submenuX < PADDING) {
          submenuX = adjustedMainPosition.x;
          submenuY = adjustedMainPosition.y + menuRect.height;
          placement = 'bottom';
          
          // If would go off-screen below, position above
          if (submenuY + 400 > window.innerHeight - PADDING) {
            submenuY = adjustedMainPosition.y - 400;
            placement = 'top';
            
            // Final fallback: position at screen edge
            if (submenuY < PADDING) {
              submenuY = PADDING;
              submenuX = Math.min(submenuX, window.innerWidth - SUBMENU_WIDTH - PADDING);
              placement = 'right';
            }
          }
        }
      }
      
      // Ensure submenu Y position is within viewport
      if (placement === 'right' || placement === 'left') {
        submenuY = Math.max(PADDING, Math.min(submenuY, window.innerHeight - 400 - PADDING));
      }
      
      setSubmenuPosition({ x: submenuX, y: submenuY, placement });
    }
  }, [position, showDiagnostics]);
  
  // Calculate position on mount and when position changes
  useEffect(() => {
    calculateSmartPosition();
  }, [calculateSmartPosition]);
  
  // Recalculate positions when window resizes
  useEffect(() => {
    const handleResize = () => {
      calculateSmartPosition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateSmartPosition]);
  
  // Recalculate submenu position when diagnostics menu shows
  useEffect(() => {
    if (showDiagnostics) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        calculateSmartPosition();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showDiagnostics, calculateSmartPosition]);
  
  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          diagnosticsMenuRef.current && !diagnosticsMenuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const handleAddWidget = (type: string) => {
    if (!activeDashboardId) return;

    const definition = getDefinition(type);
    if (!definition) {
      console.warn(`WidgetMenu: no registered widget definition for type "${type}"`);
      return;
    }

    // Calculate position for new widget
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const size = definition.defaultSize;
    let x = Math.max(20, Math.floor((viewportWidth - size.width) / 2));
    let y = Math.max(80, Math.floor((viewportHeight - size.height) / 2));

    // Calculate z-index to be higher than all existing widgets
    const dashboard = getActiveDashboard();
    const maxZIndex = dashboard?.widgets?.length > 0
      ? Math.max(...dashboard.widgets.map(w => w.position.zIndex || 1))
      : 1;
    const newZIndex = maxZIndex + 1;

    const title = definition.title;

    // showGroupSelector defaults to true when the definition omits it.
    const showGroupSelector = definition.showGroupSelector !== false;

    // Widgets that need a transparent group by default (trading widgets).
    const transparentGroup = getTransparentGroup();
    const defaultGroupId = definition.needsTransparentGroup && transparentGroup
      ? transparentGroup.id
      : undefined;

    addWidget(activeDashboardId, {
      type,
      title, // deprecated
      defaultTitle: title,
      userTitle: undefined,
      position: { x, y, width: size.width, height: size.height, zIndex: newZIndex },
      config: {},
      groupId: defaultGroupId, // Set transparent group for trading widgets
      showGroupSelector, // Hide group selector for widgets that don't need it
      isVisible: true,
      isMinimized: false
    });

    onClose();
  };

  // Handle diagnostics menu visibility with hover delay
  const handleDiagnosticsMouseEnter = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowDiagnostics(true);
  }, []);
  
  const handleDiagnosticsMouseLeave = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set new timeout to hide submenu
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDiagnostics(false);
      hoverTimeoutRef.current = null;
    }, 300); // Increased delay for easier navigation
  }, []);
  
  // Keep submenu open when hovering over it
  const handleSubmenuMouseEnter = useCallback(() => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowDiagnostics(true);
  }, []);
  
  const handleSubmenuMouseLeave = useCallback(() => {
    // Immediately hide when leaving submenu
    setShowDiagnostics(false);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Build menu sections from the widget registry by category. `definitions` is
  // referenced so the lists recompute when modules register/unregister widgets.
  void definitions;
  const toMenuItem = (def: BuiltinWidgetDefinition): MenuWidgetItem => ({
    type: def.type,
    label: def.menuLabel ?? def.title,
    icon: resolveIcon(def.icon, { size: 16 }),
  });

  const publicDataWidgets = (listByCategory('public') as BuiltinWidgetDefinition[]).map(toMenuItem);
  const privateDataWidgets = (listByCategory('private') as BuiltinWidgetDefinition[]).map(toMenuItem);
  const diagnosticWidgets = (listByCategory('diagnostics') as BuiltinWidgetDefinition[]).map(toMenuItem);

  const renderWidgetButton = (widget: MenuWidgetItem) => (
    <button
      key={widget.type}
      className={`group flex items-center w-full space-x-3 px-3 py-2 rounded-md transition-all duration-200 text-left text-sm ${
        widget.disabled 
          ? 'text-terminal-muted/50 cursor-not-allowed opacity-50' 
          : 'text-terminal-text hover:text-terminal-text hover:bg-terminal-accent/60 active:bg-terminal-accent/80 hover:shadow-sm'
      }`}
      onClick={() => !widget.disabled && handleAddWidget(widget.type)}
      disabled={widget.disabled}
    >
      <span className={`transition-colors duration-200 ${
        widget.disabled 
          ? 'text-terminal-muted/50' 
          : 'text-terminal-muted group-hover:text-terminal-text'
      }`}>
        {widget.icon}
      </span>
      <span className="transition-colors duration-200">{widget.label}</span>
    </button>
  );

  return (
    <>
      <div
        ref={menuRef}
        className="widget-menu absolute rounded-lg shadow-lg overflow-hidden z-[10002] border border-terminal-border bg-terminal-widget/95 backdrop-blur-md text-terminal-text"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y, width: '300px' }}
      >
        <div className="px-3 py-2 border-b border-terminal-border/50">
          <h3 className="text-sm font-medium">Add Widget</h3>
        </div>
        
        <div className="p-2">
          {/* Public Data Section */}
          <div className="mb-3">
            <div className="px-3 py-1 text-xs font-medium text-terminal-muted/70 uppercase tracking-wide">
              Public Data
            </div>
            <div className="space-y-1">
              {publicDataWidgets.map(renderWidgetButton)}
            </div>
          </div>

          {/* Private Data Section */}
          <div className="mb-3">
            <div className="px-3 py-1 text-xs font-medium text-terminal-muted/70 uppercase tracking-wide">
              Private Data
            </div>
            <div className="space-y-1">
              {privateDataWidgets.map(renderWidgetButton)}
            </div>
          </div>

          {/* Diagnostics Section with submenu */}
          <div>
            <button
              ref={diagnosticsButtonRef}
              className="group flex items-center justify-between w-full px-3 py-2 rounded-md text-terminal-text hover:text-terminal-text hover:bg-terminal-accent/60 active:bg-terminal-accent/80 hover:shadow-sm transition-all duration-200 text-left text-sm"
              onMouseEnter={handleDiagnosticsMouseEnter}
              onMouseLeave={handleDiagnosticsMouseLeave}
            >
              <div className="flex items-center space-x-3">
                <span className="text-terminal-muted group-hover:text-terminal-text transition-colors duration-200">
                  <Bug size={16} />
                </span>
                <span className="transition-colors duration-200">Diagnostics</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`text-terminal-muted group-hover:text-terminal-text transition-all duration-200 ${
                  submenuPosition.placement === 'left' ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>
        </div>
        
        <div className="p-2 border-t border-terminal-border/50 text-xs text-terminal-muted px-3">
          Select a widget to add to the workspace
        </div>
      </div>

      {/* Diagnostics Submenu with smart positioning */}
      {showDiagnostics && (
        <div
          ref={diagnosticsMenuRef}
          className="widget-menu absolute rounded-lg shadow-lg overflow-hidden z-[10003] border border-terminal-border bg-terminal-widget/95 backdrop-blur-md text-terminal-text"
          style={{ 
            left: submenuPosition.x,
            top: submenuPosition.y,
            width: '280px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          <div className="px-3 py-2 border-b border-terminal-border/50">
            <h3 className="text-sm font-medium">
              Diagnostics
            </h3>
          </div>
          
          <div className="p-2 space-y-1">
            {diagnosticWidgets.map(renderWidgetButton)}
          </div>
        </div>
      )}
    </>
  );
};

export default WidgetMenu;
