import type { LiveConfig, ModuleListing } from '../shared/types';

export interface DashboardStoreShape {
  dashboards: Array<{ id: string; widgets: Array<{ id: string; isMinimized?: boolean }> }>;
  toggleWidgetMinimized: (dashboardId: string, widgetId: string) => void;
}

export function defaultLiveConfig(): Required<LiveConfig> {
  return { exchanges: [], types: [], sound: true, toast: true, autoRestore: true };
}

export function passFilters(listing: ModuleListing, config: LiveConfig): boolean {
  if (config.exchanges?.length && !config.exchanges.includes(listing.exchange)) return false;
  if (config.types?.length && !config.types.includes(listing.type)) return false;
  return true;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour12: false });
}

let audioCtx: AudioContext | null = null;
/** Short two-tone alert. Lazily creates AudioContext; may be blocked by autoplay policy — that is fine. */
export function playBeep(): void {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const [freq, at] of [[880, 0], [1320, 0.12]] as const) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + at); osc.stop(t0 + at + 0.16);
    }
  } catch { /* audio unavailable — alerts degrade to toast only */ }
}

export function restoreIfMinimized(store: DashboardStoreShape, widgetId: string): void {
  const dash = store.dashboards.find((d) => d.widgets.some((w) => w.id === widgetId));
  const widget = dash?.widgets.find((w) => w.id === widgetId);
  if (dash && widget?.isMinimized) store.toggleWidgetMinimized(dash.id, widgetId);
}
