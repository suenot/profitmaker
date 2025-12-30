import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChildProcess, fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server process reference
let serverProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// Server configuration
interface ServerConfig {
  enabled: boolean;
  port: number;
  apiToken: string;
}

let serverConfig: ServerConfig = {
  enabled: true,
  port: 3001,
  apiToken: 'your-secret-token'
};

// Check if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ProfitMaker - Trading Terminal',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    backgroundColor: '#0a0a0b',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createAppMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Backend Settings',
          click: () => {
            mainWindow?.webContents.send('open-backend-settings');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Server',
      submenu: [
        {
          label: 'Start Embedded Server',
          id: 'start-server',
          enabled: !serverProcess,
          click: () => startEmbeddedServer()
        },
        {
          label: 'Stop Embedded Server',
          id: 'stop-server',
          enabled: !!serverProcess,
          click: () => stopEmbeddedServer()
        },
        { type: 'separator' },
        {
          label: 'Server Status',
          click: () => {
            const status = serverProcess ? 'Running' : 'Stopped';
            const port = serverConfig.port;
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Server Status',
              message: `Embedded Server: ${status}\nPort: ${port}`,
              buttons: ['OK']
            });
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/suenot/profitmaker')
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About ProfitMaker',
              message: 'ProfitMaker Trading Terminal',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function updateServerMenuState(): void {
  const menu = Menu.getApplicationMenu();
  if (menu) {
    const startItem = menu.getMenuItemById('start-server');
    const stopItem = menu.getMenuItemById('stop-server');
    if (startItem) startItem.enabled = !serverProcess;
    if (stopItem) stopItem.enabled = !!serverProcess;
  }
}

async function startEmbeddedServer(): Promise<boolean> {
  if (serverProcess) {
    console.log('Server is already running');
    return true;
  }

  try {
    const serverPath = isDev
      ? path.join(__dirname, '../express.ts')
      : path.join(__dirname, '../server/express.js');

    const execArgv = isDev ? ['--import', 'tsx'] : [];

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: String(serverConfig.port),
        API_TOKEN: serverConfig.apiToken,
        NODE_ENV: isDev ? 'development' : 'production'
      },
      execArgv,
      stdio: 'pipe'
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
      mainWindow?.webContents.send('server-log', { type: 'stdout', message: data.toString() });
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
      mainWindow?.webContents.send('server-log', { type: 'stderr', message: data.toString() });
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
      serverProcess = null;
      updateServerMenuState();
      mainWindow?.webContents.send('server-status', { running: false, code });
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      serverProcess = null;
      updateServerMenuState();
      mainWindow?.webContents.send('server-status', { running: false, error: err.message });
    });

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    updateServerMenuState();
    mainWindow?.webContents.send('server-status', {
      running: true,
      port: serverConfig.port
    });

    console.log(`Embedded server started on port ${serverConfig.port}`);
    return true;
  } catch (error) {
    console.error('Failed to start embedded server:', error);
    mainWindow?.webContents.send('server-status', {
      running: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

function stopEmbeddedServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    updateServerMenuState();
    mainWindow?.webContents.send('server-status', { running: false });
    console.log('Embedded server stopped');
  }
}

// IPC Handlers
ipcMain.handle('get-server-status', () => {
  return {
    running: !!serverProcess,
    config: serverConfig
  };
});

ipcMain.handle('start-server', async (_event, config?: Partial<ServerConfig>) => {
  if (config) {
    serverConfig = { ...serverConfig, ...config };
  }
  return startEmbeddedServer();
});

ipcMain.handle('stop-server', () => {
  stopEmbeddedServer();
  return true;
});

ipcMain.handle('update-server-config', (_event, config: Partial<ServerConfig>) => {
  const wasRunning = !!serverProcess;

  if (wasRunning) {
    stopEmbeddedServer();
  }

  serverConfig = { ...serverConfig, ...config };

  if (wasRunning && config.enabled !== false) {
    return startEmbeddedServer();
  }

  return true;
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    isDev
  };
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();

  // Start embedded server by default if enabled
  if (serverConfig.enabled) {
    await startEmbeddedServer();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopEmbeddedServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopEmbeddedServer();
});

// Security: Prevent new window creation except for allowed domains
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation to localhost in development
    if (isDev && parsedUrl.hostname === 'localhost') {
      return;
    }

    // Block all other navigations
    event.preventDefault();
  });
});
