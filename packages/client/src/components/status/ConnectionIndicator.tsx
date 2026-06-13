import * as React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Connection indicator — ported from the MarketMaker design system
 * (ui-marketmaker-cc `components/status/connection-indicator.tsx`,
 * https://ui.marketmaker.cc/storybook?path=/docs/status-connection-indicator--docs).
 *
 * A tiny round status pill — green (online), orange (warning/degraded), or red
 * (offline). Driven from a real health-check loop (see useServerHealth) via
 * `status`; pass `details` to reveal ping / last-update on hover.
 */

export type ConnectionStatus = 'online' | 'warning' | 'offline';

const STATUS_STYLE: Record<ConnectionStatus, { color: string; bg: string; border: string }> = {
  online: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  offline: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

export interface ConnectionIndicatorProps {
  /** Three-state status — takes precedence over `connected`. `null` renders nothing. */
  status?: ConnectionStatus | null;
  /** Back-compat boolean: true → online, false → offline. Used when `status` is omitted. */
  connected?: boolean | null;
  /** Tooltip / title text per state. */
  onlineLabel?: string;
  warningLabel?: string;
  offlineLabel?: string;
  /** Optional rich content shown in a hover tooltip (e.g. ping, last-update ms). */
  details?: React.ReactNode;
  className?: string;
}

export function ConnectionIndicator({
  status,
  connected,
  onlineLabel = 'Connected',
  warningLabel = 'Degraded',
  offlineLabel = 'Offline',
  details,
  className,
}: ConnectionIndicatorProps) {
  const [hovering, setHovering] = React.useState(false);

  const effective: ConnectionStatus | null =
    status ?? (connected == null ? null : connected ? 'online' : 'offline');

  if (effective === null) return null;

  const s = STATUS_STYLE[effective];
  const label = effective === 'online' ? onlineLabel : effective === 'warning' ? warningLabel : offlineLabel;

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Hover tooltip. bottom-full + pb-2 (not margin) keeps the hover area
          continuous so the tooltip stays reachable. */}
      {details && hovering && (
        <div className="absolute bottom-full right-0 pb-2 z-50">
          <div
            className="px-3 py-2 rounded-lg border shadow-xl text-xs font-mono whitespace-nowrap backdrop-blur-md"
            style={{ background: 'rgba(24,24,23,0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#ece8e1' }}
          >
            <div className="mb-1.5 pb-1.5 border-b border-white/10 font-semibold" style={{ color: s.color }}>
              {label}
            </div>
            {details}
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-sm border text-xs font-medium shadow-lg transition-all cursor-default"
        style={{ background: s.bg, borderColor: s.border, color: s.color }}
        title={label}
      >
        {effective === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
      </div>
    </div>
  );
}
