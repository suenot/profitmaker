import React, { useRef, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2, Settings, Minus } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import GroupColorSelector from './ui/GroupColorSelector';
import InstrumentHeaderControl from './ui/InstrumentHeaderControl';
import { useGroupStore } from '@/store/groupStore';
import { useSettingsDrawerStore } from '@/store/settingsDrawerStore';
import { useWidgetRegistry } from '@/modules/registry';

interface WidgetSimpleProps {
  id: string;
  title: string; // deprecated
  defaultTitle: string;
  userTitle?: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  groupId?: string;
  widgetType?: string; // widget type for determining trading pair
  showGroupSelector?: boolean; // optional display of group selector circle
  headerActions?: React.ReactNode; // optional additional actions in header
  onRemove: () => void;
}

const SNAP_DISTANCE = 8; // Snap distance in pixels
const HEADER_HEIGHT = 0; // Header + tabs navigation height in pixels
const COLLAPSED_WIDGET_HEIGHT = 40; // Height of collapsed widget header
const COLLAPSED_WIDGET_WIDTH = 200; // Width of collapsed widget

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const WidgetSimple: React.FC<WidgetSimpleProps> = ({
  id,
  title, // deprecated
  defaultTitle,
  userTitle,
  children,
  position,
  size,
  zIndex,
  isActive,
  groupId,
  widgetType,
  showGroupSelector = true, // default to true for backward compatibility
  headerActions,
  onRemove
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartData, setResizeStartData] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
    mousePos: { x: number; y: number };
  } | null>(null);
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  
  // State for title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  
  // Local state for real-time updates during drag/resize
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentSize, setCurrentSize] = useState(size);
  
  const getWidgetDefinition = useWidgetRegistry(s => s.getDefinition);
  const moveWidget = useDashboardStore(s => s.moveWidget);
  const resizeWidget = useDashboardStore(s => s.resizeWidget);
  const bringWidgetToFront = useDashboardStore(s => s.bringWidgetToFront);
  const updateWidgetTitle = useDashboardStore(s => s.updateWidgetTitle);
  const updateWidget = useDashboardStore(s => s.updateWidget);
  const toggleWidgetMinimized = useDashboardStore(s => s.toggleWidgetMinimized);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const dashboards = useDashboardStore(s => s.dashboards);
  
  // Group store
  const getGroupById = useGroupStore(s => s.getGroupById);
  
  // Settings drawer store
  const openSettingsDrawer = useSettingsDrawerStore(s => s.openDrawer);

  // Get other widgets for snapping
  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
  const otherWidgets = activeDashboard?.widgets.filter(w => w.id !== id) || [];
  const collapsedWidgets = activeDashboard?.widgets.filter(w => w.id !== id && w.isMinimized) || [];

  // Check if widget is collapsed
  const isCollapsed = activeDashboard?.widgets.find(w => w.id === id)?.isMinimized || false;



  // Update local state when props change (from store)
  React.useEffect(() => {
    setCurrentPosition(position);
  }, [position.x, position.y]);

  React.useEffect(() => {
    setCurrentSize(size);
  }, [size.width, size.height]);

  // Functions for title editing
  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditTitleValue(userTitle || defaultTitle);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitleValue(e.target.value);
  };

  const handleTitleSubmit = () => {
    if (activeDashboardId) {
      updateWidgetTitle(activeDashboardId, id, editTitleValue);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitleValue(userTitle || defaultTitle);
    }
  };

  const handleTitleBlur = () => {
    handleTitleSubmit();
  };

  // Removed getDefaultTradingInstrument function since we no longer auto-assign trading pairs

  // Function to update widget group
  const handleGroupChange = (newGroupId: string | undefined) => {
    if (activeDashboardId) {
      updateWidget(activeDashboardId, id, { groupId: newGroupId });
      
      // NOTE: Removed automatic instrument assignment to preserve user choices
      // Groups should retain their existing instrument settings when selected
      // Users should explicitly choose instruments through the search interface
    }
  };

  // Auto focus on input when editing
  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle maximize/minimize toggle
  const handleMaximizeToggle = useCallback(() => {
    if (isMaximized) {
      // Restore previous state
      if (preMaximizeState) {
        setCurrentPosition(preMaximizeState.position);
        setCurrentSize(preMaximizeState.size);
        if (activeDashboardId) {
          moveWidget(activeDashboardId, id, preMaximizeState.position.x, preMaximizeState.position.y);
          resizeWidget(activeDashboardId, id, preMaximizeState.size.width, preMaximizeState.size.height);
        }
      }
      setPreMaximizeState(null);
      setIsMaximized(false);
    } else {
      // Save current state and maximize
      setPreMaximizeState({
        position: currentPosition,
        size: currentSize
      });
      setIsMaximized(true);
    }
  }, [isMaximized, preMaximizeState, currentPosition, currentSize, activeDashboardId, moveWidget, resizeWidget, id]);

  // Handle widget click to bring to front
  const handleWidgetClick = useCallback(() => {
    if (activeDashboardId && !isMaximized) {
      bringWidgetToFront(activeDashboardId, id);
    }
  }, [activeDashboardId, id, bringWidgetToFront, isMaximized]);

  // Snapping logic
  const applySnapping = useCallback((x: number, y: number, width: number, height: number) => {
    let snappedX = x;
    let snappedY = y;

    // Snap to viewport edges
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Left edge
    if (Math.abs(x) < SNAP_DISTANCE) {
      snappedX = 0;
    }
    // Right edge
    if (Math.abs(x + width - viewportWidth) < SNAP_DISTANCE) {
      snappedX = viewportWidth - width;
    }
    // Top edge (accounting for header height)
    if (Math.abs(y - HEADER_HEIGHT) < SNAP_DISTANCE) {
      snappedY = HEADER_HEIGHT;
    }
    // Bottom edge
    if (Math.abs(y + height - viewportHeight) < SNAP_DISTANCE) {
      snappedY = viewportHeight - height;
    }

    // Snap to other widgets
    otherWidgets.forEach(widget => {
      const wPos = widget.position;
      
      // Snap to left/right edges of other widgets
      if (Math.abs(x - wPos.x) < SNAP_DISTANCE) {
        snappedX = wPos.x;
      }
      if (Math.abs(x - (wPos.x + wPos.width)) < SNAP_DISTANCE) {
        snappedX = wPos.x + wPos.width;
      }
      if (Math.abs((x + width) - wPos.x) < SNAP_DISTANCE) {
        snappedX = wPos.x - width;
      }
      if (Math.abs((x + width) - (wPos.x + wPos.width)) < SNAP_DISTANCE) {
        snappedX = wPos.x + wPos.width - width;
      }

      // Snap to top/bottom edges of other widgets
      if (Math.abs(y - wPos.y) < SNAP_DISTANCE) {
        snappedY = wPos.y;
      }
      if (Math.abs(y - (wPos.y + wPos.height)) < SNAP_DISTANCE) {
        snappedY = wPos.y + wPos.height;
      }
      if (Math.abs((y + height) - wPos.y) < SNAP_DISTANCE) {
        snappedY = wPos.y - height;
      }
      if (Math.abs((y + height) - (wPos.y + wPos.height)) < SNAP_DISTANCE) {
        snappedY = wPos.y + wPos.height - height;
      }
    });

    return { x: snappedX, y: snappedY };
  }, [otherWidgets]);

  // Handle drag with useCallback to prevent recreation
  const handleDrag = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // Fixed logic: calculate position relative to initial click
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Apply screen boundaries
      newX = Math.max(0, Math.min(newX, window.innerWidth - currentSize.width));
      newY = Math.max(HEADER_HEIGHT, Math.min(newY, window.innerHeight - currentSize.height));
      
      // Apply snapping
      const snapped = applySnapping(newX, newY, currentSize.width, currentSize.height);
      
      // Update local state immediately for smooth visual feedback
      setCurrentPosition({ x: snapped.x, y: snapped.y });
    }
  }, [isDragging, dragOffset.x, dragOffset.y, currentSize.width, currentSize.height, applySnapping]);

  // Handle drag end with useCallback
  const handleDragEnd = useCallback(() => {
    if (isDragging && activeDashboardId) {
      console.log('WidgetSimple: Drag end', {
        widgetId: id,
        dashboardId: activeDashboardId,
        newPosition: currentPosition
      });
      // Save final position to store
      moveWidget(activeDashboardId, id, currentPosition.x, currentPosition.y);
    }
    setIsDragging(false);
  }, [isDragging, activeDashboardId, moveWidget, id, currentPosition]);

  // Handle resize with useCallback - ENHANCED for all directions
  const handleResize = useCallback((e: MouseEvent) => {
    if (isResizing && resizeStartData && resizeDirection) {
      const deltaX = e.clientX - resizeStartData.mousePos.x;
      const deltaY = e.clientY - resizeStartData.mousePos.y;
      
      let newPosition = { ...resizeStartData.position };
      let newSize = { ...resizeStartData.size };
      
      // Calculate new position and size based on resize direction
      switch (resizeDirection) {
        case 'n': // North (top edge)
          newPosition.y = Math.min(resizeStartData.position.y + deltaY, resizeStartData.position.y + resizeStartData.size.height - 150);
          newSize.height = Math.max(150, resizeStartData.size.height - deltaY);
          break;
        case 's': // South (bottom edge)
          newSize.height = Math.max(150, resizeStartData.size.height + deltaY);
          break;
        case 'e': // East (right edge)
          newSize.width = Math.max(250, resizeStartData.size.width + deltaX);
          break;
        case 'w': // West (left edge)
          newPosition.x = Math.min(resizeStartData.position.x + deltaX, resizeStartData.position.x + resizeStartData.size.width - 250);
          newSize.width = Math.max(250, resizeStartData.size.width - deltaX);
          break;
        case 'ne': // North-East (top-right corner)
          newPosition.y = Math.min(resizeStartData.position.y + deltaY, resizeStartData.position.y + resizeStartData.size.height - 150);
          newSize.height = Math.max(150, resizeStartData.size.height - deltaY);
          newSize.width = Math.max(250, resizeStartData.size.width + deltaX);
          break;
        case 'nw': // North-West (top-left corner)
          newPosition.x = Math.min(resizeStartData.position.x + deltaX, resizeStartData.position.x + resizeStartData.size.width - 250);
          newPosition.y = Math.min(resizeStartData.position.y + deltaY, resizeStartData.position.y + resizeStartData.size.height - 150);
          newSize.width = Math.max(250, resizeStartData.size.width - deltaX);
          newSize.height = Math.max(150, resizeStartData.size.height - deltaY);
          break;
        case 'se': // South-East (bottom-right corner)
          newSize.width = Math.max(250, resizeStartData.size.width + deltaX);
          newSize.height = Math.max(150, resizeStartData.size.height + deltaY);
          break;
        case 'sw': // South-West (bottom-left corner)
          newPosition.x = Math.min(resizeStartData.position.x + deltaX, resizeStartData.position.x + resizeStartData.size.width - 250);
          newSize.width = Math.max(250, resizeStartData.size.width - deltaX);
          newSize.height = Math.max(150, resizeStartData.size.height + deltaY);
          break;
      }
      
      // Apply bounds checking
      newPosition.x = Math.max(0, Math.min(newPosition.x, window.innerWidth - newSize.width));
      newPosition.y = Math.max(HEADER_HEIGHT, Math.min(newPosition.y, window.innerHeight - newSize.height));
      
      // Apply snapping
      const snapped = applySnapping(newPosition.x, newPosition.y, newSize.width, newSize.height);
      newPosition.x = snapped.x;
      newPosition.y = snapped.y;
      
      // Update local state immediately for smooth visual feedback
      setCurrentPosition(newPosition);
      setCurrentSize(newSize);
    }
  }, [isResizing, resizeStartData, resizeDirection, applySnapping]);

  // Handle resize end with useCallback
  const handleResizeEnd = useCallback(() => {
    if (isResizing && activeDashboardId) {
      console.log('WidgetSimple: Resize end', {
        widgetId: id,
        dashboardId: activeDashboardId,
        newPosition: currentPosition,
        newSize: currentSize
      });
      // Save final position and size to store
      moveWidget(activeDashboardId, id, currentPosition.x, currentPosition.y);
      resizeWidget(activeDashboardId, id, currentSize.width, currentSize.height);
    }
    setIsResizing(false);
    setResizeDirection(null);
    setResizeStartData(null);
  }, [isResizing, activeDashboardId, moveWidget, resizeWidget, id, currentPosition, currentSize]);

  // Handle drag start - FIXED LOGIC
  const handleDragStart = (e: React.MouseEvent) => {
    // Bring widget to front when starting drag
    if (activeDashboardId) {
      bringWidgetToFront(activeDashboardId, id);
    }
    
    // Save offset relative to current widget position in viewport
    setDragOffset({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
    setIsDragging(true);
    console.log('WidgetSimple: Drag start', { 
      widgetId: id, 
      dashboardId: activeDashboardId,
      clickPos: { x: e.clientX, y: e.clientY },
      widgetPos: currentPosition,
      offset: { x: e.clientX - currentPosition.x, y: e.clientY - currentPosition.y }
    });
  };

  // Handle resize start - ENHANCED for multiple directions
  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Bring widget to front when starting resize
    if (activeDashboardId) {
      bringWidgetToFront(activeDashboardId, id);
    }
    
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStartData({
      position: currentPosition,
      size: currentSize,
      mousePos: { x: e.clientX, y: e.clientY }
    });
    
    console.log('WidgetSimple: Resize start', { 
      widgetId: id, 
      dashboardId: activeDashboardId,
      direction,
      startPosition: currentPosition,
      startSize: currentSize
    });
  };

  // Mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // Mouse event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  // Handle collapse toggle
  const handleCollapseToggle = useCallback(() => {
    if (!activeDashboardId) return;
    
    // Let the store handle all the logic for saving/restoring position
    toggleWidgetMinimized(activeDashboardId, id);
  }, [activeDashboardId, id, toggleWidgetMinimized]);

  // Handle settings button click
  const handleSettingsClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (widgetType) {
      openSettingsDrawer(id, widgetType, userTitle || defaultTitle, groupId);
    }
  }, [id, widgetType, userTitle, defaultTitle, groupId, openSettingsDrawer]);

  // Check if widget has settings available (registry-driven: a widget has a
  // settings button iff its definition provides a Settings panel).
  const hasSettings = Boolean(widgetType && getWidgetDefinition(widgetType)?.Settings);

  // Check if group has complete instrument data to hide widget title
  const selectedGroup = groupId ? getGroupById(groupId) : undefined;
  const hasCompleteInstrument = selectedGroup && 
    selectedGroup.account && 
    selectedGroup.exchange && 
    selectedGroup.market && 
    selectedGroup.tradingPair;
  const shouldHideTitle = hasCompleteInstrument;

  // Check if selected group is transparent
  const isTransparentGroup = !selectedGroup || selectedGroup?.color === 'transparent';

  return (
    <div
      ref={widgetRef}
      className={cn(
        "widget-container animate-fade-in border border-terminal-border",
        isMaximized && "border-0",
        isCollapsed && "!h-10 overflow-hidden"
      )}
      style={{
        left: isMaximized ? 0 : `${currentPosition.x}px`,
        top: isMaximized ? 0 : `${currentPosition.y}px`,
        width: isMaximized ? '100vw' : `${currentSize.width}px`,
        height: isMaximized ? '100vh' : `${currentSize.height}px`,
        zIndex: isMaximized ? 10001 : (isCollapsed ? 10000 : zIndex),
        position: isMaximized ? 'fixed' : 'absolute',
      }}
      onClick={handleWidgetClick}
    >
      <div 
        className={cn(
          "widget-header h-10 px-3 py-2 flex items-center justify-between",
          isTransparentGroup ? "bg-transparent" : "bg-terminal-accent/60",
          !isMaximized && !isCollapsed && "cursor-move"
        )}
        onMouseDown={(!isMaximized && !isCollapsed) ? handleDragStart : undefined}
      >
        <div className="flex items-center flex-1 min-w-0 space-x-2">
          {!isCollapsed && showGroupSelector && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <GroupColorSelector
                selectedGroupId={groupId}
                onGroupSelect={handleGroupChange}
                className="flex-shrink-0"
              />
              <InstrumentHeaderControl
                selectedGroupId={groupId}
                className="flex-shrink-0"
              />
            </div>
          )}
          {!shouldHideTitle && (
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitleValue}
                  onChange={handleTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleBlur}
                  className="text-xs font-semibold tracking-[0.01em] bg-transparent border-none outline-none text-terminal-text w-full min-w-0"
                  style={{ margin: 0, padding: 0 }}
                />
              ) : (
                <h3 
                  className="text-xs font-semibold tracking-[0.01em] truncate text-terminal-text cursor-pointer"
                  onDoubleClick={handleTitleDoubleClick}
                  title="Double click to edit"
                >
                  {userTitle || defaultTitle}
                </h3>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {!isCollapsed && headerActions}
          {!isCollapsed && hasSettings && (
            <button 
              className="terminal-icon-button terminal-icon-button--subtle"
              onClick={handleSettingsClick}
              title="Widget Settings"
            >
              <Settings size={14} className="text-terminal-muted hover:text-terminal-text transition-colors" />
            </button>
          )}
          <button 
            className="terminal-icon-button terminal-icon-button--subtle"
            onClick={handleCollapseToggle}
            title={isCollapsed ? "Expand widget" : "Collapse widget"}
          >
            <Minus size={14} className="text-terminal-muted hover:text-terminal-text transition-colors" />
          </button>
          {!isCollapsed && (
            <button 
              className="terminal-icon-button terminal-icon-button--subtle"
              onClick={handleMaximizeToggle}
            >
              {isMaximized ? (
                <Minimize2 size={14} className="text-terminal-muted hover:text-terminal-text transition-colors" />
              ) : (
                <Maximize2 size={14} className="text-terminal-muted hover:text-terminal-text transition-colors" />
              )}
            </button>
          )}
          <button 
            className="terminal-icon-button terminal-icon-button--subtle text-terminal-muted hover:text-terminal-negative"
            onClick={onRemove}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className={cn(
          "widget-content h-[calc(100%-40px)] overflow-auto bg-terminal-widget",
          widgetType === 'chart' || widgetType === 'trades' ? '' : 'p-3'
        )}>
          {children}
        </div>
      )}
      
      {/* Enhanced Resize handles - 8 directions */}
      {!isMaximized && !isCollapsed && (
        <>
          {/* Corner handles */}
          <div 
            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/30"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div 
            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/30"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div 
            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/30"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div 
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/30"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          
          {/* Edge handles */}
          <div 
            className="absolute top-0 left-3 right-3 h-1 cursor-n-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/20"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div 
            className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/20"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div 
            className="absolute top-3 bottom-3 left-0 w-1 cursor-w-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/20"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div 
            className="absolute top-3 bottom-3 right-0 w-1 cursor-e-resize opacity-0 hover:opacity-50 transition-opacity bg-terminal-muted/20"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};

export default WidgetSimple;
