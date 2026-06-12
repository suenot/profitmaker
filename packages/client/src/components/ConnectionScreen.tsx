import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useDataProviderStore } from '../store/dataProviderStore';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

interface ConnectionScreenProps {
  /** Called after the user saves a working (or chosen) server config. */
  onConnected?: () => void;
}

/**
 * First-run / unreachable-backend screen. The terminal requires a running
 * ccxt-server; this lets the user point at one (URL + token), test it, and
 * persist the result into the primary-server provider config.
 */
const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ onConnected }) => {
  const { providers, updateProvider } = useDataProviderStore();
  const primary = providers['primary-server'];
  const primaryConfig = (primary?.config ?? {}) as { serverUrl?: string; token?: string };

  const [serverUrl, setServerUrl] = useState(primaryConfig.serverUrl ?? 'http://localhost:3001');
  const [token, setToken] = useState(primaryConfig.token ?? '');
  const [testState, setTestState] = useState<TestState>('idle');
  const [message, setMessage] = useState<string>('');

  const testConnection = async (): Promise<boolean> => {
    setTestState('testing');
    setMessage('');
    try {
      const base = serverUrl.replace(/\/$/, '');
      const response = await fetch(`${base}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json().catch(() => ({}));
      setTestState('ok');
      setMessage(`Server reachable — v${data.version ?? '?'} • ccxt ${data.ccxtVersion ?? '?'} • db ${data.db ? 'ok' : 'down'}`);
      return true;
    } catch (error) {
      setTestState('fail');
      setMessage(`Could not connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const saveAndConnect = async () => {
    const ok = await testConnection();
    // Persist whatever the user entered into the primary-server provider so the
    // health poll and every data call pick it up.
    updateProvider('primary-server', {
      config: { serverUrl: serverUrl.replace(/\/$/, ''), token: token || undefined },
    });
    if (ok) onConnected?.();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-terminal-bg p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect to the trading server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Profitmaker runs against a ccxt-server backend. Enter its URL and access
            token to continue.
          </p>

          <div className="space-y-2">
            <Label htmlFor="cs-server-url">Server URL</Label>
            <Input
              id="cs-server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cs-token">Access token</Label>
            <Input
              id="cs-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="API token"
            />
          </div>

          {message && (
            <p className={`text-sm ${testState === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testState === 'testing' || !serverUrl}
            >
              {testState === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
            <Button onClick={saveAndConnect} disabled={testState === 'testing' || !serverUrl}>
              Save & connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionScreen;
