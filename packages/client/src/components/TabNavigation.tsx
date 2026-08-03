import React, { useState, useEffect } from 'react';
import { Plus, Bell, Sun, Moon, X, PanelsTopLeft } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardStore } from '@/store/dashboardStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Badge } from './ui/badge';
import UserDrawer from './UserDrawer';
import NotificationHistory from './NotificationHistory';
import { AnimatedLogo } from './AnimatedLogo';
import { SsoUserChip } from './SsoUserChip';

const TabNavigation: React.FC = () => {
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();


  // State for renaming dashboards
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Dashboard store
  const dashboards = useDashboardStore(s => s.dashboards);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const setActiveDashboard = useDashboardStore(s => s.setActiveDashboard);
  const addDashboard = useDashboardStore(s => s.addDashboard);
  const removeDashboard = useDashboardStore(s => s.removeDashboard);
  const updateDashboard = useDashboardStore(s => s.updateDashboard);
  const initializeWithDefault = useDashboardStore(s => s.initializeWithDefault);

  // Initialize default dashboard on first launch
  useEffect(() => {
    initializeWithDefault();
  }, [initializeWithDefault]);

  // Sync URL with active dashboard
  useEffect(() => {
    if (activeDashboardId) {
      window.location.hash = `#dashboard/${activeDashboardId}`;
    }
  }, [activeDashboardId]);

  // Listen to URL changes and update active dashboard
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#dashboard\/(.+)$/);
      if (match && match[1] && match[1] !== activeDashboardId) {
        const dashboardId = match[1];
        const dashboard = dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
          setActiveDashboard(dashboardId);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activeDashboardId, dashboards, setActiveDashboard]);

  // Get notification store
  const { unreadCount, setHistoryOpen } = useNotificationStore();

  // Handler for notification bell click
  const handleNotificationClick = () => {
    setIsNotificationHistoryOpen(true);
    setHistoryOpen(true);
  };

  // Handlers for dashboard tabs
  const handleAddDashboard = () => {
    const newId = addDashboard({
      title: 'Dashboard',
      description: 'New dashboard',
      widgets: [],
      layout: {
        gridSize: { width: 1920, height: 1080 },
        snapToGrid: true,
        gridStep: 10,
      },
      isDefault: false,
    });
    console.log('TabNavigation: Created new dashboard', newId);
  };

  const handleRemoveDashboard = (dashboardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dashboards.length > 1) {
      removeDashboard(dashboardId);
    }
  };

  // Handlers for renaming dashboards
  const handleDashboardDoubleClick = (dashboard: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDashboardId(dashboard.id);
    setEditingTitle(dashboard.title);
  };

  const handleTitleSave = () => {
    if (editingDashboardId && editingTitle.trim()) {
      updateDashboard(editingDashboardId, { title: editingTitle.trim() });
    }
    setEditingDashboardId(null);
    setEditingTitle('');
  };

  const handleTitleCancel = () => {
    setEditingDashboardId(null);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  return (
    <div className="terminal-navigation flex flex-col h-auto bg-terminal-bg border-b border-terminal-border">
      <div className="flex min-w-0 items-center justify-between h-14 px-3 gap-3">
        <div className="flex min-w-0 items-center h-full gap-3">
          <div className="terminal-brand flex shrink-0 items-center gap-2 pr-3 border-r border-terminal-border">
            <AnimatedLogo
              width={28}
              height={28}
              className="transition-opacity hover:opacity-80"
            />
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] uppercase">
              <span>Profitmaker</span>
              <span className="text-terminal-muted font-medium">Terminal</span>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto hide-scrollbar h-full">
            {dashboards.map((dashboard) => (
              <div
                role="button"
                tabIndex={0}
                key={dashboard.id}
                className={`terminal-tab flex items-center gap-1.5 px-2.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-xs ${
                  activeDashboardId === dashboard.id ? 'terminal-tab--active text-terminal-text' : 'text-terminal-muted'
                }`}
                onClick={() => {
                  if (editingDashboardId !== dashboard.id) {
                    console.log('TabNavigation: Switching to dashboard', dashboard.id, dashboard.title);
                    setActiveDashboard(dashboard.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (editingDashboardId !== dashboard.id) setActiveDashboard(dashboard.id);
                  }
                }}
              >
                {editingDashboardId === dashboard.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    className="text-xs bg-transparent border-none outline-none w-full min-w-[80px] max-w-[200px]"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="select-none"
                    onDoubleClick={(e) => handleDashboardDoubleClick(dashboard, e)}
                  >
                    {dashboard.title}
                  </span>
                )}
                {dashboards.length > 1 && editingDashboardId !== dashboard.id && (
                  <button 
                    className="terminal-icon-button terminal-icon-button--subtle -mr-1 text-terminal-muted hover:text-terminal-negative"
                    onClick={(e) => handleRemoveDashboard(dashboard.id, e)}
                    title={`Close ${dashboard.title}`}
                    aria-label={`Close dashboard ${dashboard.title}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="terminal-icon-button terminal-icon-button--subtle shrink-0 text-terminal-muted"
              onClick={handleAddDashboard}
              title="New dashboard"
              aria-label="New dashboard"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 h-full">
          <div className="hidden 2xl:flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-terminal-muted pr-1">
            <PanelsTopLeft size={13} />
            <span>Workspace</span>
          </div>
          <button
            type="button"
            className="terminal-icon-button terminal-icon-button--subtle relative"
            onClick={handleNotificationClick}
            title="Notifications"
          >
            <Bell size={18} className="text-terminal-muted" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>
          <button
            type="button"
            className="terminal-icon-button terminal-icon-button--subtle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-terminal-muted" />
            ) : (
              <Moon size={18} className="text-terminal-muted" />
            )}
          </button>
          {/* Single auth/identity control: active-identity avatar → compact
              dropdown (switch identities, add login, manage accounts, log out).
              "Manage accounts" opens the exchange-accounts drawer. */}
          <SsoUserChip onManageAccounts={() => setIsUserDrawerOpen(true)} />
        </div>
      </div>
      <UserDrawer open={isUserDrawerOpen} onOpenChange={setIsUserDrawerOpen} />
      <NotificationHistory 
        open={isNotificationHistoryOpen} 
        onOpenChange={(open) => {
          setIsNotificationHistoryOpen(open);
          setHistoryOpen(open);
        }} 
      />
    </div>
  );
};

export default TabNavigation;
