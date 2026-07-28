/**
 * Scalper palette, ported from scalper-iced (`src/theme.rs`, Unlicense).
 *
 * Deliberately its own palette rather than the terminal's CSS variables: the
 * panes are canvases drawn against a near-black panel, and the colours encode
 * meaning (bid/ask/spread/last) that must not drift with the app theme.
 */

export const BACKGROUND = '#1a1a2e';
export const PANEL_BG = '#161628';
export const HEADER_BG = '#121222';
export const BID_GREEN = '#26a69a';
export const ASK_RED = '#ef5350';
export const SPREAD_YELLOW = '#ffeb3b';
export const LAST_PRICE_LINE = '#ffd700';
export const TEXT_PRIMARY = '#e0e0e0';
export const TEXT_BRIGHT = '#ffffff';
export const TEXT_DIM = '#808090';
export const GRID_LINE = '#2a2a3e';

/** Resting-size ramp: the alpha carries the intensity, the hue carries the side. */
export function bidHeatmap(intensity: number): string {
  return `rgba(38,166,154,${(0.15 + clamp01(intensity) * 0.65).toFixed(3)})`;
}

export function askHeatmap(intensity: number): string {
  return `rgba(239,83,80,${(0.15 + clamp01(intensity) * 0.65).toFixed(3)})`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';
