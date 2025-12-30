import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type BackendMode = 'embedded' | 'remote';

export interface BackendSettings {
  mode: BackendMode;
  embedded: {
    enabled: boolean;
    port: number;
    apiToken: string;
  };
  remote: {
    url: string;
    apiToken: string;
    wsUrl: string;
  };
}

export interface ServerStatus {
  running: boolean;
  port?: number;
  error?: string;
}

interface BackendSettingsState {
  settings: BackendSettings;
  serverStatus: ServerStatus;
  isElectron: boolean;
  logs: Array<{ type: 'stdout' | 'stderr'; message: string; timestamp: number }>;

  // Actions
  setMode: (mode: BackendMode) => void;
  updateEmbeddedSettings: (settings: Partial<BackendSettings['embedded']>) => void;
  updateRemoteSettings: (settings: Partial<BackendSettings['remote']>) => void;
  setServerStatus: (status: ServerStatus) => void;
  addLog: (log: { type: 'stdout' | 'stderr'; message: string }) => void;
  clearLogs: () => void;
  getActiveApiUrl: () => string;
  getActiveWsUrl: () => string;
  getActiveApiToken: () => string;
}

const DEFAULT_SETTINGS: BackendSettings = {
  mode: 'embedded',
  embedded: {
    enabled: true,
    port: 3001,
    apiToken: 'your-secret-token'
  },
  remote: {
    url: 'http://localhost:3001',
    apiToken: 'your-secret-token',
    wsUrl: 'ws://localhost:3001'
  }
};

// Detect if running in Electron
const detectElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
};

export const useBackendSettingsStore = create<BackendSettingsState>()(
  persist(
    immer((set, get) => ({
      settings: DEFAULT_SETTINGS,
      serverStatus: { running: false },
      isElectron: detectElectron(),
      logs: [],

      setMode: (mode: BackendMode) =>
        set((state) => {
          state.settings.mode = mode;
        }),

      updateEmbeddedSettings: (newSettings: Partial<BackendSettings['embedded']>) =>
        set((state) => {
          state.settings.embedded = { ...state.settings.embedded, ...newSettings };
        }),

      updateRemoteSettings: (newSettings: Partial<BackendSettings['remote']>) =>
        set((state) => {
          state.settings.remote = { ...state.settings.remote, ...newSettings };
        }),

      setServerStatus: (status: ServerStatus) =>
        set((state) => {
          state.serverStatus = status;
        }),

      addLog: (log: { type: 'stdout' | 'stderr'; message: string }) =>
        set((state) => {
          state.logs.push({ ...log, timestamp: Date.now() });
          // Keep only last 100 logs
          if (state.logs.length > 100) {
            state.logs = state.logs.slice(-100);
          }
        }),

      clearLogs: () =>
        set((state) => {
          state.logs = [];
        }),

      getActiveApiUrl: () => {
        const { settings, isElectron } = get();
        if (isElectron && settings.mode === 'embedded') {
          return `http://localhost:${settings.embedded.port}`;
        }
        return settings.remote.url;
      },

      getActiveWsUrl: () => {
        const { settings, isElectron } = get();
        if (isElectron && settings.mode === 'embedded') {
          return `ws://localhost:${settings.embedded.port}`;
        }
        return settings.remote.wsUrl;
      },

      getActiveApiToken: () => {
        const { settings, isElectron } = get();
        if (isElectron && settings.mode === 'embedded') {
          return settings.embedded.apiToken;
        }
        return settings.remote.apiToken;
      }
    })),
    {
      name: 'backend-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);

// Initialize Electron event listeners if in Electron environment
if (typeof window !== 'undefined' && window.electronAPI) {
  const { setServerStatus, addLog } = useBackendSettingsStore.getState();

  window.electronAPI.onServerStatus((status) => {
    setServerStatus({
      running: status.running,
      port: status.port,
      error: status.error
    });
  });

  window.electronAPI.onServerLog((log) => {
    addLog(log);
  });

  // Get initial server status
  window.electronAPI.getServerStatus().then((status) => {
    setServerStatus({
      running: status.running,
      port: status.config.port
    });
  });
}
