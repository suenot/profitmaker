import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Timezone toggle — ported from the MarketMaker design system
 * (ui-marketmaker-cc `components/status/timezone-toggle.tsx`,
 * https://ui.marketmaker.cc/storybook?path=/docs/status-timezone-toggle--docs).
 *
 * A pill that selects the timezone the terminal clock renders in. Left-click
 * cycles UTC → Local → UTC+3; right-click (or hover, with `expandOnHover`)
 * opens the full picker. Kept API-compatible with the source so it can be
 * swapped for a shared package later.
 */

// UTC offsets available for selection in the dropdown.
export const TZ_OPTIONS = [
  { value: 'utc', label: 'UTC', offset: 0 },
  { value: 'local', label: 'LOC', offset: null },
  { value: 'utc+1', label: '+1', offset: 1 },
  { value: 'utc+2', label: '+2', offset: 2 },
  { value: 'utc+3', label: '+3', offset: 3 },
  { value: 'utc+4', label: '+4', offset: 4 },
  { value: 'utc+5', label: '+5', offset: 5 },
  { value: 'utc+5.5', label: '+5:30', offset: 5.5 },
  { value: 'utc+6', label: '+6', offset: 6 },
  { value: 'utc+7', label: '+7', offset: 7 },
  { value: 'utc+8', label: '+8', offset: 8 },
  { value: 'utc+9', label: '+9', offset: 9 },
  { value: 'utc+10', label: '+10', offset: 10 },
  { value: 'utc+12', label: '+12', offset: 12 },
  { value: 'utc-5', label: '-5', offset: -5 },
  { value: 'utc-6', label: '-6', offset: -6 },
  { value: 'utc-7', label: '-7', offset: -7 },
  { value: 'utc-8', label: '-8', offset: -8 },
] as const;

export type TZValue = (typeof TZ_OPTIONS)[number]['value'];

// Left-click cycles through this short list; the full list is in the dropdown.
const CYCLE: TZValue[] = ['utc', 'local', 'utc+3'];

/**
 * Format a Date as 24h HH:MM:SS in the given timezone selection. `local` uses
 * the host timezone; everything else is a fixed UTC offset (fractional offsets
 * like +5:30 supported).
 */
export function timeInTz(date: Date, tz: TZValue): string {
  const option = TZ_OPTIONS.find((o) => o.value === tz) ?? TZ_OPTIONS[0];
  if (option.offset === null) {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  }
  const shifted = new Date(date.getTime() + option.offset * 3_600_000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Short label shown on the pill / used as a clock suffix. */
export function tzLabel(tz: TZValue): string {
  const option = TZ_OPTIONS.find((o) => o.value === tz) ?? TZ_OPTIONS[0];
  return tz === 'local' ? 'LOC' : tz === 'utc' ? 'UTC' : `UTC${option.label}`;
}

export interface TimezoneToggleProps {
  /** Controlled value. Omit to let the component manage its own state. */
  value?: TZValue;
  /** Initial value when uncontrolled. */
  defaultValue?: TZValue;
  /** Fired whenever the timezone changes. */
  onChange?: (tz: TZValue) => void;
  /** Open the full timezone picker on hover (in addition to right-click). */
  expandOnHover?: boolean;
  /** localStorage key for persistence when uncontrolled. Pass null to disable. */
  storageKey?: string | null;
  className?: string;
}

function colorFor(tz: TZValue): { bg: string; border: string; color: string } {
  if (tz === 'utc') return { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', color: '#3b82f6' };
  if (tz === 'local') return { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', color: '#a855f7' };
  return { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', color: '#22c55e' };
}

export function TimezoneToggle({
  value,
  defaultValue = 'utc',
  onChange,
  expandOnHover = false,
  storageKey = 'tz',
  className,
}: TimezoneToggleProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<TZValue>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const stored = localStorage.getItem(storageKey) as TZValue | null;
      if (stored && TZ_OPTIONS.some((o) => o.value === stored)) return stored;
    }
    return defaultValue;
  });
  const [open, setOpen] = React.useState(false);

  const tz = isControlled ? (value as TZValue) : internal;

  const commit = React.useCallback(
    (next: TZValue) => {
      if (!isControlled) {
        setInternal(next);
        if (typeof window !== 'undefined' && storageKey) localStorage.setItem(storageKey, next);
      }
      onChange?.(next);
    },
    [isControlled, storageKey, onChange],
  );

  const cycle = React.useCallback(() => {
    const idx = CYCLE.indexOf(tz);
    commit(CYCLE[(idx + 1) % CYCLE.length]);
  }, [tz, commit]);

  const option = TZ_OPTIONS.find((o) => o.value === tz) ?? TZ_OPTIONS[0];
  const c = colorFor(tz);

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={expandOnHover ? () => setOpen(true) : undefined}
      onMouseLeave={expandOnHover ? () => setOpen(false) : undefined}
    >
      {/* Dropdown menu. bottom-full + pb-2 (not margin) keeps the hover area
          continuous between the pill and the menu. Anchored right (the terminal
          mounts this in the bottom-right corner). */}
      {open && (
        <div className="absolute bottom-full right-0 pb-2 z-50">
          <div
            className="py-1 rounded-lg backdrop-blur-md border shadow-xl min-w-[120px] max-h-[280px] overflow-y-auto"
            style={{ background: 'rgba(24,24,23,0.95)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {TZ_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  commit(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-xs font-mono flex items-center gap-2 hover:bg-white/5 transition-colors',
                  tz === opt.value ? 'text-blue-400' : 'text-gray-400',
                )}
              >
                {tz === opt.value && <span className="text-blue-400">•</span>}
                <span className={tz === opt.value ? '' : 'ml-3'}>
                  {opt.value === 'local' ? 'Local' : opt.value === 'utc' ? 'UTC' : `UTC${opt.label}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main button: left-click cycles, right-click opens the full picker. */}
      <button
        onClick={cycle}
        onContextMenu={(e) => {
          e.preventDefault();
          // Don't let the right-click bubble to the terminal's own context menu
          // (the add-widget menu lives on the page container).
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-sm border text-xs font-medium shadow-lg transition-all cursor-pointer hover:scale-105"
        style={{ background: c.bg, borderColor: c.border, color: c.color }}
        title={
          expandOnHover
            ? 'Click to cycle (UTC → Local → UTC+3) · hover for all timezones'
            : 'Click to cycle (UTC → Local → UTC+3) · Right-click for all timezones'
        }
      >
        <Clock size={12} />
        <span className="font-mono">
          {tz === 'local' ? 'LOC' : tz === 'utc' ? 'UTC' : `UTC${option.label}`}
        </span>
      </button>
    </div>
  );
}
