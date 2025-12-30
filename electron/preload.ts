import { contextBridge, ipcRenderer } from 'electron';

// Server configuration type
interface ServerConfig {
  enabled: boolean;
  port: number;
  apiToken: string;
}

// Server status type
interface ServerStatus {
  running: boolean;
  config: ServerConfig;
}

// App info type
interface AppInfo {
  version: string;
  electron: string;
  node: string;
  chrome: string;
  isDev: boolean;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Server control
  getServerStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('get-server-status'),
  startServer: (config?: Partial<ServerConfig>): Promise<boolean> =>
    ipcRenderer.invoke('start-server', config),
  stopServer: (): Promise<boolean> => ipcRenderer.invoke('stop-server'),
  updateServerConfig: (config: Partial<ServerConfig>): Promise<boolean> =>
    ipcRenderer.invoke('update-server-config', config),

  // App info
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke('get-app-info'),

  // Event listeners
  onServerStatus: (callback: (status: { running: boolean; port?: number; error?: string; code?: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: { running: boolean; port?: number; error?: string; code?: number }) => callback(status);
    ipcRenderer.on('server-status', handler);
    return () => ipcRenderer.removeListener('server-status', handler);
  },

  onServerLog: (callback: (log: { type: 'stdout' | 'stderr'; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, log: { type: 'stdout' | 'stderr'; message: string }) => callback(log);
    ipcRenderer.on('server-log', handler);
    return () => ipcRenderer.removeListener('server-log', handler);
  },

  onOpenBackendSettings: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-backend-settings', handler);
    return () => ipcRenderer.removeListener('open-backend-settings', handler);
  },

  // Platform detection
  isElectron: true,
  platform: process.platform
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI?: {
      getServerStatus: () => Promise<ServerStatus>;
      startServer: (config?: Partial<ServerConfig>) => Promise<boolean>;
      stopServer: () => Promise<boolean>;
      updateServerConfig: (config: Partial<ServerConfig>) => Promise<boolean>;
      getAppInfo: () => Promise<AppInfo>;
      onServerStatus: (callback: (status: { running: boolean; port?: number; error?: string; code?: number }) => void) => () => void;
      onServerLog: (callback: (log: { type: 'stdout' | 'stderr'; message: string }) => void) => () => void;
      onOpenBackendSettings: (callback: () => void) => () => void;
      isElectron: true;
      platform: NodeJS.Platform;
    };
  }
}
