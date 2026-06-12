import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import ConnectionScreen from './ConnectionScreen';

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

  // Initial gate check (re-runs whenever the server URL changes).
  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    checkHealth().then((ok) => {
      if (cancelled) return;
      setStatus(ok ? 'connected' : 'unreachable');
      setRuntimeDisconnected(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checkHealth]);

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
      {children}
    </>
  );
};

export default BackendGate;
