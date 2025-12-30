import React, { useState, useEffect } from 'react';
import { Plus, Bell, Sun, Moon, User, X, Server } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from '@/store/userStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useBackendSettingsStore } from '@/store/backendSettingsStore';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import UserDrawer from './UserDrawer';
import NotificationHistory from './NotificationHistory';
import { AnimatedLogo } from './AnimatedLogo';
import { BackendSettingsDialog } from './BackendSettingsDialog';

const TabNavigation: React.FC = () => {
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const [isBackendSettingsOpen, setIsBackendSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);

  // Backend settings store
  const serverStatus = useBackendSettingsStore(s => s.serverStatus);

  
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

  // Get active user
  const activeUserId = useUserStore(s => s.activeUserId);
  const users = useUserStore(s => s.users);
  const activeUser = users.find(u => u.id === activeUserId);

  // Get notification store
  const { unreadCount, setHistoryOpen } = useNotificationStore();

  const handleThemeClick = (e: React.MouseEvent) => {
    if (e.altKey) {
      setIsThemeSheetOpen(true);
    } else {
      toggleTheme();
    }
  };

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
    <div className="flex flex-col h-auto bg-terminal-bg border-b border-terminal-border mb-0 pb-0">
      <div className="flex justify-between h-12 px-2">
        <div className="flex h-full">
          {/* Animated Logo */}
          <div className="flex-shrink-0 flex items-center px-2">
            <AnimatedLogo 
              width={32} 
              height={32} 
              className="transition-opacity hover:opacity-80" 
            />
          </div>
          {/* Dashboard Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar h-full">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className={`flex items-center px-4 h-full cursor-pointer whitespace-nowrap ${
                  activeDashboardId === dashboard.id ? 'text-terminal-text border-b-2' : 'text-terminal-muted hover:bg-terminal-accent/10'
                }`}
                style={activeDashboardId === dashboard.id ? { borderBottomColor: 'hsl(349.8deg 92.59% 78.82%)' } : {}}
                onClick={() => {
                  if (editingDashboardId !== dashboard.id) {
                    console.log('TabNavigation: Switching to dashboard', dashboard.id, dashboard.title);
                    setActiveDashboard(dashboard.id);
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
                    className="text-sm bg-transparent border-none outline-none w-full min-w-[80px] max-w-[200px]"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className="text-sm select-none"
                    onDoubleClick={(e) => handleDashboardDoubleClick(dashboard, e)}
                  >
                    {dashboard.title}
                  </span>
                )}
                {dashboards.length > 1 && editingDashboardId !== dashboard.id && (
                  <button 
                    className="ml-2 p-1 rounded-sm hover:bg-terminal-widget/50 text-terminal-muted hover:text-terminal-negative transition-colors"
                    onClick={(e) => handleRemoveDashboard(dashboard.id, e)}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button 
              className="flex items-center justify-center w-10 h-full text-terminal-muted hover:bg-terminal-accent/20"
              onClick={handleAddDashboard}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        {/* Block with icons */}
        <div className="flex items-center space-x-3 h-full">
          <button
            className="p-2 rounded-full hover:bg-terminal-accent/50 transition-colors relative"
            onClick={() => setIsBackendSettingsOpen(true)}
            title="Backend Settings"
          >
            <Server size={18} className={serverStatus.running ? "text-green-500" : "text-terminal-muted"} />
          </button>
          <button
            className="p-2 rounded-full hover:bg-terminal-accent/50 transition-colors relative"
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
            className="p-2 rounded-full hover:bg-terminal-accent/50 transition-colors"
            onClick={handleThemeClick}
            title="Click - toggle theme, Option+Click - theme settings"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-terminal-muted" />
            ) : (
              <Moon size={18} className="text-terminal-muted" />
            )}
          </button>
          <button className="p-2 rounded-full hover:bg-terminal-accent/50 transition-colors" onClick={() => setIsUserDrawerOpen(true)}>
            {activeUser ? (
              <Avatar className="w-7 h-7">
                {activeUser.avatarUrl ? (
                  <AvatarImage src={activeUser.avatarUrl} alt={activeUser.email} />
                ) : (
                  <AvatarFallback>{activeUser.email.slice(0, 2).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
            ) : (
              <User size={18} className="text-terminal-muted" />
            )}
          </button>
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
      <BackendSettingsDialog
        open={isBackendSettingsOpen}
        onOpenChange={setIsBackendSettingsOpen}
      />
    </div>
  );
};

export default TabNavigation;
