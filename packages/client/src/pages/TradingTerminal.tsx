import React, { useState, useCallback, useRef, useEffect } from 'react';
import Widget from '@/components/WidgetSimple';
import WidgetMenu from '@/components/WidgetMenu';
import TabNavigation from '@/components/TabNavigation';
import { useDashboardStore } from '@/store/dashboardStore';
import { useWidgetRegistry } from '@/modules/registry';
import UnknownWidgetPlaceholder from '@/modules/UnknownWidgetPlaceholder';
import AlignmentGuides from '@/components/AlignmentGuides';
import { GuideLineType } from '@/types/alignmentGuides';
import CollapsedWidgetsZone from '@/components/CollapsedWidgetsZone';

const TradingTerminal: React.FC = () => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Subscribe to dashboard store changes
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const dashboards = useDashboardStore(s => s.dashboards);
  const removeWidget = useDashboardStore(s => s.removeWidget);
  const updateWidget = useDashboardStore(s => s.updateWidget);

  // Subscribe to the widget registry so widgets re-render when modules
  // register/unregister definitions at runtime.
  const definitions = useWidgetRegistry(s => s.definitions);

  // Get current active dashboard
  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
  const widgets = activeDashboard?.widgets || [];
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLineType[]>([]);
  
  // Simple alignment guides without complex type dependencies
  const [calculateGuides, clearGuides] = [
    () => ([]), // Placeholder for calculateGuides
    () => {} // Placeholder for clearGuides
  ];
  
  const handleWidgetMove = useCallback((widgetId: string, rect: DOMRect) => {
    setActiveWidgetId(widgetId);
    // Placeholder for guides calculation
    setGuideLines([]);
    return { x: null, y: null };
  }, []);
  
  const handleWidgetResize = useCallback((widgetId: string, rect: DOMRect) => {
    setActiveWidgetId(widgetId);
    // Placeholder for guides calculation
    setGuideLines([]);
    return { x: null, y: null };
  }, []);
  
  const handleWidgetDragEnd = useCallback(() => {
    setActiveWidgetId(null);
    setGuideLines([]);
  }, []);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Debug logging for dashboard changes
  React.useEffect(() => {
    console.log('TradingTerminal: Dashboard changed', {
      activeDashboardId,
      activeDashboard: activeDashboard?.title,
      widgetsCount: widgets.length,
      widgets: widgets.map(w => ({ id: w.id, title: w.title, position: w.position }))
    });
  }, [activeDashboardId, activeDashboard, widgets]);
  
  return (
    <div 
      className="min-h-screen bg-terminal-bg text-terminal-text flex flex-col"
      onContextMenu={handleContextMenu}
      onClick={() => contextMenuPosition && setContextMenuPosition(null)}
    >
      <TabNavigation />
      
      <main 
        ref={mainContainerRef}
        className="flex-1 p-0 h-[calc(100vh-86px)] relative"
        style={{ marginTop: 0 }}
      >
        <AlignmentGuides guideLines={guideLines} />
        
        {widgets.map((widget) => {
          const definition = definitions[widget.type];
          const WidgetComponent = definition?.Component;
          const HeaderActions = definition?.HeaderActions;

          const onRemove = () => activeDashboard && removeWidget(activeDashboard.id, widget.id);

          return (
            <Widget
              key={widget.id}
              id={widget.id}
              title={widget.title} // deprecated
              defaultTitle={widget.defaultTitle}
              userTitle={widget.userTitle}
              position={{ x: widget.position.x, y: widget.position.y }}
              size={{ width: widget.position.width, height: widget.position.height }}
              zIndex={widget.position.zIndex || 1}
              isActive={true} // Dashboard widgets are always "active" in their context
              groupId={widget.groupId}
              widgetType={widget.type}
              showGroupSelector={widget.showGroupSelector}
              headerActions={HeaderActions ? <HeaderActions widgetId={widget.id} /> : undefined}
              onRemove={onRemove}
            >
              {WidgetComponent ? (
                <WidgetComponent
                  widgetId={widget.id}
                  groupId={widget.groupId}
                  config={widget.config ?? {}}
                  updateConfig={(patch) =>
                    activeDashboard && updateWidget(activeDashboard.id, widget.id, {
                      config: { ...(widget.config ?? {}), ...patch },
                    })
                  }
                />
              ) : (
                <UnknownWidgetPlaceholder type={widget.type} onRemove={onRemove} />
              )}
            </Widget>
          );
        })}
      </main>
      
      {contextMenuPosition && (
        <WidgetMenu 
          position={contextMenuPosition} 
          onClose={() => setContextMenuPosition(null)} 
        />
      )}
      
      {/* Collapsed widgets zone */}
      <CollapsedWidgetsZone />
      
      <div className="fixed bottom-2 right-2 flex items-center text-terminal-muted text-xs bg-terminal-accent/30 px-3 py-1 rounded-md">
        <span className="mr-2">{currentTime.toLocaleTimeString('ru-RU', { hour12: false })}</span>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
};

export default TradingTerminal; 