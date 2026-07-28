import React, { useState, useCallback, useRef, useEffect } from 'react';
import Widget from '@/components/WidgetSimple';
import WidgetMenu from '@/components/WidgetMenu';
import TabNavigation from '@/components/TabNavigation';
import { useDashboardStore } from '@/store/dashboardStore';
import { useWidgetRegistry } from '@/modules/registry';
import UnknownWidgetPlaceholder from '@/modules/UnknownWidgetPlaceholder';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import AlignmentGuides from '@/components/AlignmentGuides';
import { GuideLineType } from '@/types/alignmentGuides';
import CollapsedWidgetsZone from '@/components/CollapsedWidgetsZone';
import { TimezoneToggle, timeInTz, type TZValue, TZ_OPTIONS } from '@/components/status/TimezoneToggle';
import { ConnectionIndicator, type ConnectionStatus } from '@/components/status/ConnectionIndicator';
import { useServerHealth } from '@/hooks/useServerHealth';

const TZ_STORAGE_KEY = 'tz';

const TradingTerminal: React.FC = () => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Timezone for the status-bar clock, controlled here so the clock re-renders
  // when the shared TimezoneToggle changes it. Persisted under the same key the
  // toggle uses when uncontrolled, so the two stay in sync across reloads.
  const [tz, setTz] = useState<TZValue>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TZ_STORAGE_KEY) as TZValue | null;
      if (stored && TZ_OPTIONS.some(o => o.value === stored)) return stored;
    }
    return 'utc';
  });

  const handleTzChange = useCallback((next: TZValue) => {
    setTz(next);
    if (typeof window !== 'undefined') localStorage.setItem(TZ_STORAGE_KEY, next);
  }, []);

  // Real backend connectivity for the status-bar indicator (polls /health).
  const health = useServerHealth();
  const connStatus: ConnectionStatus = health.status === 'checking' ? 'warning' : health.status;
  
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
                // Per-widget boundary: a throw inside one widget must not take
                // the dashboard with it. The app-level boundary in App.tsx is
                // the backstop for everything this lets through — until this
                // existed, a single broken widget blanked the whole terminal.
                <ErrorBoundary
                  key={`${widget.id}-boundary`}
                  fallbackTitle={`${widget.defaultTitle || widget.type} stopped working`}
                  showDetails
                >
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
                </ErrorBoundary>
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
      
      <div className="fixed bottom-2 right-2 flex items-center gap-2">
        <div className="flex items-center text-terminal-muted text-xs bg-terminal-accent/30 px-3 py-1 rounded-md">
          <span className="font-mono tabular-nums">{timeInTz(currentTime, tz)}</span>
        </div>
        <ConnectionIndicator
          status={connStatus}
          onlineLabel="Backend connected"
          warningLabel="Checking connection…"
          offlineLabel="Backend offline"
          details={
            health.lastCheckedAt != null ? (
              <div className="space-y-0.5">
                {health.latencyMs != null && (
                  <div>
                    <span className="text-gray-400">Ping: </span>
                    <span style={{ color: '#22c55e' }}>{health.latencyMs} ms</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Updated: </span>
                  <span className="text-gray-300">
                    {Math.max(0, Math.round((currentTime.getTime() - health.lastCheckedAt) / 1000))}s ago
                  </span>
                </div>
              </div>
            ) : undefined
          }
        />
        <TimezoneToggle value={tz} onChange={handleTzChange} expandOnHover />
      </div>
    </div>
  );
};

export default TradingTerminal; 