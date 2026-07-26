import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "sonner";

export type WidgetType = 'chart' | 'portfolio' | 'orderForm' | 'transactions' | 'watchlist' | 'news' | 'calendar' | 'positions' | 'orderbook' | 'orderbookV2' | 'trades' | 'tradesV2' | 'dataProviderSettings' | 'dataProviderDemo' | 'dataProviderSetup' | 'dataProviderDebug' | 'userBalances' | 'userTradingData' | 'leverages';

export interface WidgetGroup {
  id: string;
  name: string;
  color: string;
  symbol: string;
  isActive: boolean;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  groupId: string | null;
}

interface WidgetContextType {
  widgets: Widget[];
  widgetGroups: WidgetGroup[];
  activeGroupId: string | null;
  addWidget: (type: WidgetType, groupId?: string | null) => void;
  removeWidget: (id: string) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;
  updateWidgetSize: (id: string, size: { width: number; height: number }) => void;
  activateWidget: (id: string) => void;
  createGroup: (name: string, symbol: string, color: string) => string;
  updateGroup: (id: string, data: Partial<Omit<WidgetGroup, 'id'>>) => void;
  deleteGroup: (id: string) => void;
  addWidgetToGroup: (widgetId: string, groupId: string) => void;
  removeWidgetFromGroup: (widgetId: string) => void;
  activateGroup: (groupId: string) => void;
  getGroupColor: (groupId: string | null) => string;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

const defaultWidgetSizes: Record<WidgetType, { width: number; height: number }> = {
  chart: { width: 650, height: 330 },
  portfolio: { width: 800, height: 350 },
  orderForm: { width: 350, height: 550 },
  transactions: { width: 400, height: 350 },
  watchlist: { width: 350, height: 400 },
  news: { width: 400, height: 500 },
  calendar: { width: 400, height: 350 },
  positions: { width: 500, height: 350 },
  orderbook: { width: 500, height: 600 },
  orderbookV2: { width: 500, height: 650 },
  trades: { width: 600, height: 500 },
  tradesV2: { width: 600, height: 550 },
  dataProviderSettings: { width: 500, height: 450 },
  dataProviderDemo: { width: 700, height: 400 },
  dataProviderSetup: { width: 500, height: 400 },
  dataProviderDebug: { width: 700, height: 500 },
  userBalances: { width: 700, height: 600 },
  userTradingData: { width: 700, height: 600 },
  leverages: { width: 780, height: 620 }
};

const widgetTitles: Record<WidgetType, string> = {
  chart: 'Chart',
  portfolio: 'Balance',
  orderForm: 'Place Order',
  transactions: 'Transaction History',
  watchlist: 'Watchlist',
  news: 'Market News',
  calendar: 'Economic Calendar',
  positions: 'Open Positions',
  orderbook: 'Order Book',
  orderbookV2: 'Order Book V2',
  trades: 'Trades',
  tradesV2: 'Trades V2',
  dataProviderSettings: 'Data Provider Settings',
  dataProviderDemo: 'Data Provider Demo',
  dataProviderSetup: 'Data Provider Setup',
  dataProviderDebug: 'Data Provider Debug',
  userBalances: 'User Balances',
  userTradingData: 'User Trading Data',
  leverages: 'Leverages'
};

// Group color palette - aligned with GroupSelector colors
const groupColors = [
  'transparent', // transparent (default)
  '#00BCD4', // cyan
  '#F44336', // red  
  '#9C27B0', // purple
  '#2196F3', // blue
  '#4CAF50', // green
  '#FF9800', // orange
  '#E91E63'  // pink
];

export const WidgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetGroups, setWidgetGroups] = useState<WidgetGroup[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Initialize with some default widgets
  useEffect(() => {
    const initialWidgets: Widget[] = [
      {
        id: '1',
        type: 'portfolio',
        title: 'Balance',
        position: { x: 20, y: 80 },
        size: { width: 800, height: 350 },
        zIndex: 1,
        isActive: false,
        groupId: null
      },
      {
        id: '2',
        type: 'orderForm',
        title: 'Place Order',
        position: { x: 830, y: 80 },
        size: { width: 350, height: 550 },
        zIndex: 2,
        isActive: false,
        groupId: null
      },
      {
        id: '3',
        type: 'chart',
        title: 'Chart',
        position: { x: 20, y: 440 },
        size: { width: 650, height: 330 },
        zIndex: 3,
        isActive: false,
        groupId: null
      },
      {
        id: '4',
        type: 'transactions',
        title: 'Transaction History',
        position: { x: 680, y: 440 },
        size: { width: 400, height: 330 },
        zIndex: 4,
        isActive: false,
        groupId: null
      },
    ];
    
    // Create default groups - aligned with GroupSelector
    const defaultGroups: WidgetGroup[] = [
      {
        id: 'group-0',
        name: 'Transparent',
        color: groupColors[0],
        symbol: 'DEFAULT',
        isActive: true
      },
      {
        id: 'group-1',
        name: 'Cyan',
        color: groupColors[1],
        symbol: 'CYAN',
        isActive: false
      },
      {
        id: 'group-2',
        name: 'Red',
        color: groupColors[2],
        symbol: 'RED',
        isActive: false
      },
      {
        id: 'group-3',
        name: 'Purple',
        color: groupColors[3],
        symbol: 'PURPLE',
        isActive: false
      },
      {
        id: 'group-4',
        name: 'Blue',
        color: groupColors[4],
        symbol: 'BLUE',
        isActive: false
      },
      {
        id: 'group-5',
        name: 'Green',
        color: groupColors[5],
        symbol: 'GREEN',
        isActive: false
      },
      {
        id: 'group-6',
        name: 'Orange',
        color: groupColors[6],
        symbol: 'ORANGE',
        isActive: false
      },
      {
        id: 'group-7',
        name: 'Pink',
        color: groupColors[7],
        symbol: 'PINK',
        isActive: false
      }
    ];
    
    setWidgets(initialWidgets);
    setWidgetGroups(defaultGroups);
    setNextZIndex(5);
    setActiveGroupId(defaultGroups[0].id);
  }, []);

  const addWidget = (type: WidgetType, groupId: string | null = null) => {
    const id = `widget-${Date.now()}`;
    
    // Calculate position - try to place it in a visible area
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Start from center and adjust based on existing widgets
    let x = Math.max(20, Math.floor((viewportWidth - defaultWidgetSizes[type].width) / 2));
    let y = Math.max(80, Math.floor((viewportHeight - defaultWidgetSizes[type].height) / 2));
    
    // Offset a bit to make the new widget visible
    x += widgets.length * 15;
    y += widgets.length * 15;
    
    // Make sure it stays within viewport bounds
    x = Math.min(x, viewportWidth - defaultWidgetSizes[type].width - 20);
    y = Math.min(y, viewportHeight - defaultWidgetSizes[type].height - 20);
    
    const newWidget: Widget = {
      id,
      type,
      title: widgetTitles[type],
      position: { x, y },
      size: defaultWidgetSizes[type],
      zIndex: nextZIndex,
      isActive: true,
      groupId
    };
    
    setWidgets(prev => [...prev, newWidget]);
    setNextZIndex(prev => prev + 1);
    
    toast(`Widget "${widgetTitles[type]}" added`, {
      duration: 2000,
    });
    
    return id;
  };

  const removeWidget = (id: string) => {
    const widgetToRemove = widgets.find(w => w.id === id);
    
    setWidgets(prev => prev.filter(widget => widget.id !== id));
    
    if (widgetToRemove) {
      toast(`Widget "${widgetToRemove.title}" removed`, {
        duration: 2000,
      });
    }
  };

  const updateWidgetPosition = (id: string, position: { x: number; y: number }) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id ? { ...widget, position } : widget
      )
    );
  };

  const updateWidgetSize = (id: string, size: { width: number; height: number }) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id ? { ...widget, size } : widget
      )
    );
  };

  const activateWidget = (id: string) => {
    setWidgets(prev => {
      const inactiveWidgets = prev.map(widget => 
        widget.id === id ? { ...widget, zIndex: nextZIndex, isActive: true } : { ...widget, isActive: false }
      );
      return inactiveWidgets;
    });
    
    setNextZIndex(prev => prev + 1);
  };
  
  // Group management functions
  const createGroup = (name: string, symbol: string, color: string) => {
    const id = `group-${Date.now()}`;
    const newGroup: WidgetGroup = {
      id,
      name,
      color,
      symbol,
      isActive: false
    };
    
    setWidgetGroups(prev => [...prev, newGroup]);
    
    toast(`Group "${name}" created`, {
      duration: 2000,
    });
    
    return id;
  };
  
  const updateGroup = (id: string, data: Partial<Omit<WidgetGroup, 'id'>>) => {
    setWidgetGroups(prev => 
      prev.map(group => 
        group.id === id ? { ...group, ...data } : group
      )
    );
    
    // If the group being updated is also the active group, we need to update it
    if (id === activeGroupId && data.symbol) {
      // Update all widgets in this group to use the new symbol
      const updatedGroup = widgetGroups.find(g => g.id === id);
      if (updatedGroup) {
        const newName = data.name || updatedGroup.name;
        toast(`Group "${newName}" updated`, {
          duration: 2000,
        });
      }
    }
  };
  
  const deleteGroup = (id: string) => {
    const groupToDelete = widgetGroups.find(g => g.id === id);
    
    // Remove this group from all widgets
    setWidgets(prev => 
      prev.map(widget => 
        widget.groupId === id ? { ...widget, groupId: null } : widget
      )
    );
    
    setWidgetGroups(prev => prev.filter(group => group.id !== id));
    
    // If this was the active group, clear the active group
    if (activeGroupId === id) {
      setActiveGroupId(null);
    }
    
    if (groupToDelete) {
      toast(`Group "${groupToDelete.name}" deleted`, {
        duration: 2000,
      });
    }
  };
  
  const addWidgetToGroup = (widgetId: string, groupId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId ? { ...widget, groupId } : widget
      )
    );
    
    const widget = widgets.find(w => w.id === widgetId);
    const group = widgetGroups.find(g => g.id === groupId);
    
    if (widget && group) {
      toast(`Widget "${widget.title}" added to group "${group.name}"`, {
        duration: 2000,
      });
    }
  };
  
  const removeWidgetFromGroup = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    const group = widget?.groupId ? widgetGroups.find(g => g.id === widget.groupId) : null;
    
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId ? { ...widget, groupId: null } : widget
      )
    );
    
    if (widget && group) {
      toast(`Widget "${widget.title}" removed from group "${group.name}"`, {
        duration: 2000,
      });
    }
  };
  
  const activateGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    
    setWidgetGroups(prev => 
      prev.map(group => 
        group.id === groupId ? { ...group, isActive: true } : { ...group, isActive: false }
      )
    );
    
    const group = widgetGroups.find(g => g.id === groupId);
    if (group) {
      toast(`Group "${group.name}" activated`, {
        duration: 2000,
      });
    }
  };
  
  const getGroupColor = (groupId: string | null) => {
    if (!groupId) return '';
    const group = widgetGroups.find(g => g.id === groupId);
    return group ? group.color : '';
  };

  return (
    <WidgetContext.Provider 
      value={{ 
        widgets, 
        widgetGroups,
        activeGroupId,
        addWidget, 
        removeWidget, 
        updateWidgetPosition, 
        updateWidgetSize, 
        activateWidget,
        createGroup,
        updateGroup,
        deleteGroup,
        addWidgetToGroup,
        removeWidgetFromGroup,
        activateGroup,
        getGroupColor
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
};

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (context === undefined) {
    throw new Error('useWidget must be used within a WidgetProvider');
  }
  return context;
};
