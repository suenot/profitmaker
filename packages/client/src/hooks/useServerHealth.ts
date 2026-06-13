import { useEffect, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';

export type ServerHealthStatus = 'checking' | 'online' | 'offline';

export interface ServerHealth {
  status: ServerHealthStatus;
  /** Round-trip latency of the last successful /health probe, ms. */
  latencyMs: number | null;
  /** Epoch ms of the last completed probe (success or failure). */
  lastCheckedAt: number | null;
}

const DEFAULT_POLL_MS = 15_000;
const TIMEOUT_MS = 5_000;

/**
 * Polls the active ccxt-server's `/health` endpoint so the UI can reflect REAL
 * backend connectivity (drives the status-bar ConnectionIndicator). Mirrors
 * BackendGate's probe but additionally exposes round-trip latency and the
 * last-checked time for the hover tooltip. Re-checks on mount, every `pollMs`,
 * and whenever the server URL changes.
 */
export function useServerHealth(pollMs: number = DEFAULT_POLL_MS): ServerHealth {
  const providers = useDataProviderStore((s) => s.providers);
  const serverUrl = (providers['primary-server']?.config as { serverUrl?: string } | undefined)?.serverUrl;

  const [health, setHealth] = useState<ServerHealth>({
    status: 'checking',
    latencyMs: null,
    lastCheckedAt: null,
  });

  useEffect(() => {
    if (!serverUrl) {
      setHealth({ status: 'offline', latencyMs: null, lastCheckedAt: Date.now() });
      return;
    }

    let cancelled = false;
    const base = serverUrl.replace(/\/$/, '');

    const check = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const started = performance.now();
      try {
        const res = await fetch(`${base}/health`, { signal: controller.signal });
        clearTimeout(timer);
        if (cancelled) return;
        const latency = Math.round(performance.now() - started);
        setHealth({
          status: res.ok ? 'online' : 'offline',
          latencyMs: res.ok ? latency : null,
          lastCheckedAt: Date.now(),
        });
      } catch {
        clearTimeout(timer);
        if (cancelled) return;
        setHealth({ status: 'offline', latencyMs: null, lastCheckedAt: Date.now() });
      }
    };

    check();
    const id = setInterval(check, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [serverUrl, pollMs]);

  return health;
}
