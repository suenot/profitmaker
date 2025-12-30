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

// Electron API exposed via preload script
interface ElectronAPI {
  // Server control
  getServerStatus: () => Promise<ServerStatus>;
  startServer: (config?: Partial<ServerConfig>) => Promise<boolean>;
  stopServer: () => Promise<boolean>;
  updateServerConfig: (config: Partial<ServerConfig>) => Promise<boolean>;

  // App info
  getAppInfo: () => Promise<AppInfo>;

  // Event listeners (return cleanup function)
  onServerStatus: (
    callback: (status: { running: boolean; port?: number; error?: string; code?: number }) => void
  ) => () => void;
  onServerLog: (
    callback: (log: { type: 'stdout' | 'stderr'; message: string }) => void
  ) => () => void;
  onOpenBackendSettings: (callback: () => void) => () => void;

  // Platform detection
  isElectron: true;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
