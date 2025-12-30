import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useBackendSettingsStore,
  type BackendMode,
} from '@/store/backendSettingsStore';
import {
  Server,
  Globe,
  Play,
  Square,
  RefreshCw,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface BackendSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackendSettingsDialog({
  open,
  onOpenChange,
}: BackendSettingsDialogProps) {
  const {
    settings,
    serverStatus,
    isElectron,
    logs,
    setMode,
    updateEmbeddedSettings,
    updateRemoteSettings,
    clearLogs,
  } = useBackendSettingsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local settings when store changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleModeChange = (mode: BackendMode) => {
    setMode(mode);
    setLocalSettings((prev) => ({ ...prev, mode }));
  };

  const handleStartServer = async () => {
    if (!window.electronAPI) return;

    setIsLoading(true);
    try {
      await window.electronAPI.startServer({
        port: localSettings.embedded.port,
        apiToken: localSettings.embedded.apiToken,
      });
    } catch (error) {
      console.error('Failed to start server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopServer = async () => {
    if (!window.electronAPI) return;

    setIsLoading(true);
    try {
      await window.electronAPI.stopServer();
    } catch (error) {
      console.error('Failed to stop server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmbedded = () => {
    updateEmbeddedSettings(localSettings.embedded);
    if (window.electronAPI && serverStatus.running) {
      // Restart server with new settings
      window.electronAPI.updateServerConfig({
        port: localSettings.embedded.port,
        apiToken: localSettings.embedded.apiToken,
      });
    }
  };

  const handleSaveRemote = () => {
    updateRemoteSettings(localSettings.remote);
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const url =
        settings.mode === 'embedded'
          ? `http://localhost:${localSettings.embedded.port}/health`
          : `${localSettings.remote.url}/health`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Connection successful!');
      } else {
        alert(`Connection failed: ${response.statusText}`);
      }
    } catch (error) {
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Backend Settings
          </DialogTitle>
          <DialogDescription>
            Configure how the application connects to the trading backend server.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={settings.mode}
          onValueChange={(v) => handleModeChange(v as BackendMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="embedded"
              disabled={!isElectron}
              className="flex items-center gap-2"
            >
              <Server className="h-4 w-4" />
              Embedded Server
              {!isElectron && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Desktop Only
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="remote" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Remote Server
            </TabsTrigger>
          </TabsList>

          <TabsContent value="embedded" className="space-y-4 mt-4">
            {isElectron ? (
              <>
                {/* Server Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {serverStatus.running ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        Server {serverStatus.running ? 'Running' : 'Stopped'}
                      </p>
                      {serverStatus.running && serverStatus.port && (
                        <p className="text-sm text-muted-foreground">
                          Port: {serverStatus.port}
                        </p>
                      )}
                      {serverStatus.error && (
                        <p className="text-sm text-red-500">{serverStatus.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {serverStatus.running ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleStopServer}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        <span className="ml-2">Stop</span>
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleStartServer}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-2">Start</span>
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Settings */}
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="embedded-port">Port</Label>
                    <Input
                      id="embedded-port"
                      type="number"
                      value={localSettings.embedded.port}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          embedded: {
                            ...prev.embedded,
                            port: parseInt(e.target.value) || 3001,
                          },
                        }))
                      }
                      placeholder="3001"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="embedded-token">API Token</Label>
                    <Input
                      id="embedded-token"
                      type="password"
                      value={localSettings.embedded.apiToken}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          embedded: {
                            ...prev.embedded,
                            apiToken: e.target.value,
                          },
                        }))
                      }
                      placeholder="your-secret-token"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-start">Start server automatically</Label>
                    <Switch
                      id="auto-start"
                      checked={localSettings.embedded.enabled}
                      onCheckedChange={(checked) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          embedded: { ...prev.embedded, enabled: checked },
                        }))
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Server Logs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Server Logs
                    </Label>
                    <Button variant="ghost" size="sm" onClick={clearLogs}>
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="h-32 rounded-md border bg-black/50 p-2">
                    <div className="font-mono text-xs space-y-1">
                      {logs.length === 0 ? (
                        <p className="text-muted-foreground">No logs yet...</p>
                      ) : (
                        logs.map((log, i) => (
                          <p
                            key={i}
                            className={
                              log.type === 'stderr'
                                ? 'text-red-400'
                                : 'text-green-400'
                            }
                          >
                            {log.message}
                          </p>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Button onClick={handleSaveEmbedded} className="w-full">
                  Save Settings
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Embedded server is only available in the desktop application.</p>
                <p className="text-sm mt-2">
                  Use the "Remote Server" tab to connect to an external backend.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="remote" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="remote-url">Server URL</Label>
                <Input
                  id="remote-url"
                  value={localSettings.remote.url}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      remote: { ...prev.remote, url: e.target.value },
                    }))
                  }
                  placeholder="http://localhost:3001"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="remote-ws">WebSocket URL</Label>
                <Input
                  id="remote-ws"
                  value={localSettings.remote.wsUrl}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      remote: { ...prev.remote, wsUrl: e.target.value },
                    }))
                  }
                  placeholder="ws://localhost:3001"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="remote-token">API Token</Label>
                <Input
                  id="remote-token"
                  type="password"
                  value={localSettings.remote.apiToken}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      remote: { ...prev.remote, apiToken: e.target.value },
                    }))
                  }
                  placeholder="your-secret-token"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button onClick={handleSaveRemote} className="flex-1">
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
