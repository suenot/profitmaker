import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import ConnectionScreen from './ConnectionScreen';
import { resolveServerToken } from '../modules/api';
import { getSsoToken } from '../services/ssoClient';

type GateStatus = 'checking' | 'connected' | 'unreachable';

const RUNTIME_POLL_MS = 30_000;

/**
 * Gates the terminal behind a reachable ccxt-server backend.
 *
 * On mount it health-checks the primary-server provider:
 *   checking   → spinner
 *   connected  → render the terminal (children)
 *   unreachable→ ConnectionScreen (URL/token entry + test)
 *
 * Once connected, a 30s runtime poll keeps watch; if the backend drops it shows
 * a non-blocking banner over the still-rendered terminal rather than ejecting
 * the user back to the connection screen.
 */
const BackendGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const providers = useDataProviderStore((s) => s.providers);
  const primary = providers['primary-server'];
  const serverUrl = (primary?.config as { serverUrl?: string } | undefined)?.serverUrl;

  const [status, setStatus] = useState<GateStatus>('checking');
  const [runtimeDisconnected, setRuntimeDisconnected] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!serverUrl) return false;
    try {
      const base = serverUrl.replace(/\/$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }, [serverUrl]);

  // /health is public, so a reachable server can still reject every data call.
  // Self-hosters hit this on first run (API_TOKEN set, browser has no token).
  // Probe one authenticated read; skip it for SSO users, whose token the
  // server verifies against the auth service.
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!serverUrl || getSsoToken()) return true;
    try {
      const token = resolveServerToken();
      const response = await fetch(`${serverUrl.replace(/\/$/, '')}/api/exchange/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.status !== 401;
    } catch {
      return true; // network errors are the health check's job
    }
  }, [serverUrl]);

  // Initial gate check (re-runs whenever the server URL changes).
  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    checkHealth().then(async (ok) => {
      if (cancelled) return;
      setStatus(ok ? 'connected' : 'unreachable');
      setRuntimeDisconnected(false);
      if (ok) {
        const authed = await checkAuth();
        if (!cancelled) setUnauthorized(!authed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checkHealth, checkAuth]);

  // Runtime poll once connected.
  useEffect(() => {
    if (status !== 'connected') return;
    pollRef.current = setInterval(async () => {
      const ok = await checkHealth();
      setRuntimeDisconnected(!ok);
    }, RUNTIME_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [status, checkHealth]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-terminal-bg">
        <div className="text-terminal-text/70 text-sm animate-pulse">Connecting to the trading server…</div>
      </div>
    );
  }

  if (status === 'unreachable') {
    return <ConnectionScreen onConnected={() => setStatus('connected')} />;
  }

  if (showTokenForm) {
    return (
      <ConnectionScreen
        reason="The server answered, but it rejected this browser's access token."
        onConnected={() => {
          setShowTokenForm(false);
          setUnauthorized(false);
        }}
      />
    );
  }

  return (
    <>
      {runtimeDisconnected && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[1000] bg-red-600/90 text-white text-sm text-center py-1.5 px-4"
        >
          Backend disconnected — retrying every 30s. Live data may be stale.
        </div>
      )}
      {unauthorized && !runtimeDisconnected && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[1000] bg-amber-600/95 text-white text-sm text-center py-1.5 px-4"
        >
          The server needs an access token.{' '}
          <button type="button" className="underline font-medium" onClick={() => setShowTokenForm(true)}>
            Enter token
          </button>{' '}
          or sign in with MarketMaker (top right).
        </div>
      )}
      {children}
    </>
  );
};

export default BackendGate;
