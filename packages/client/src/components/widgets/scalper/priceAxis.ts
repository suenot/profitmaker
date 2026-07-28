/**
 * The scalper panel's shared price axis.
 *
 * Every pane of the widget — cluster chart, bubble chart, DOM ladder, tick
 * chart — draws against this one axis, which is the entire point of the layout:
 * a price row is at the same y in all of them, so a wall in the book lines up
 * with the cluster that traded into it.
 *
 * Ported from scalper-iced (`src/price_axis.rs`, Unlicense). Kept as plain data
 * plus pure functions so the panes stay dumb canvases and the widget owns state.
 */

export type FollowMode = 'auto' | 'locked' | 'manual';

export interface PriceAxis {
  /** Latest traded / mid price. */
  lastPrice: number;
  /** The instrument's own tick, the floor for grouping. */
  tickSize: number;
  /** Price per drawn row — the grouping the user scrolls through. */
  displayStep: number;
  /** Price at the vertical middle of every pane. */
  centerPrice: number;
  /** Row height in pixels. */
  rowHeight: number;
  followMode: FollowMode;
}

export const DEFAULT_ROW_HEIGHT = 20;
export const MIN_ROW_HEIGHT = 10;
export const MAX_ROW_HEIGHT = 48;

/**
 * Grouping ladder, in multiples of the tick. The intermediate 1.5/3/7 steps are
 * what make Ctrl+scroll feel continuous instead of jumping ×10 at a time.
 */
const STEP_MULTIPLES = [
  1, 1.5, 2, 3, 5, 7,
  10, 15, 20, 30, 50, 70,
  100, 150, 200, 300, 500, 700,
  1000, 1500, 2000, 3000, 5000, 7000, 10000,
];

export function createPriceAxis(tickSize: number, displayStep = tickSize): PriceAxis {
  return {
    lastPrice: 0,
    tickSize: tickSize > 0 ? tickSize : 0.01,
    displayStep: displayStep > 0 ? displayStep : tickSize,
    centerPrice: 0,
    rowHeight: DEFAULT_ROW_HEIGHT,
    followMode: 'auto',
  };
}

/** Higher prices are at the top, so y grows as price falls. */
export function priceToY(axis: PriceAxis, price: number, canvasHeight: number): number {
  return canvasHeight / 2 + ((axis.centerPrice - price) / axis.displayStep) * axis.rowHeight;
}

export function yToPrice(axis: PriceAxis, y: number, canvasHeight: number): number {
  const rowDelta = (y - canvasHeight / 2) / axis.rowHeight;
  return axis.centerPrice - rowDelta * axis.displayStep;
}

/** Row index relative to the centre row; negative is above (higher price). */
export function priceToRow(axis: PriceAxis, price: number): number {
  return Math.round((axis.centerPrice - price) / axis.displayStep);
}

export function visibleRows(axis: PriceAxis, canvasHeight: number): number {
  return Math.floor(canvasHeight / axis.rowHeight);
}

export function visiblePriceRange(axis: PriceAxis, canvasHeight: number): { high: number; low: number } {
  const halfRows = visibleRows(axis, canvasHeight) / 2;
  return {
    high: axis.centerPrice + halfRows * axis.displayStep,
    low: axis.centerPrice - halfRows * axis.displayStep,
  };
}

/** New price from the feed. Only 'auto' re-centres; 'locked'/'manual' stay put. */
export function withLastPrice(axis: PriceAxis, price: number): PriceAxis {
  if (!Number.isFinite(price) || price <= 0) return axis;
  const next: PriceAxis = { ...axis, lastPrice: price };
  if (axis.followMode === 'auto') next.centerPrice = price;
  // A fresh axis has no centre yet; without this the first frames draw at 0.
  if (!axis.centerPrice) next.centerPrice = price;
  return next;
}

/** Plain wheel: pan. Panning while following means the user took over. */
export function withScroll(axis: PriceAxis, deltaRows: number): PriceAxis {
  return {
    ...axis,
    followMode: axis.followMode === 'auto' ? 'manual' : axis.followMode,
    centerPrice: axis.centerPrice + deltaRows * axis.displayStep,
  };
}

/** Shift+wheel: zoom, i.e. taller or shorter rows. */
export function withZoom(axis: PriceAxis, delta: number): PriceAxis {
  const rowHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, axis.rowHeight * (1 + delta * 0.1)));
  return { ...axis, rowHeight };
}

/** Ctrl+wheel: coarser or finer price grouping. */
export function withPriceStep(axis: PriceAxis, delta: number): PriceAxis {
  const currentMultiple = axis.displayStep / axis.tickSize;
  if (delta > 0) {
    const next = STEP_MULTIPLES.find(s => s > currentMultiple * 1.01);
    return next ? { ...axis, displayStep: axis.tickSize * next } : axis;
  }
  const prev = [...STEP_MULTIPLES].reverse().find(s => s < currentMultiple * 0.99);
  return prev ? { ...axis, displayStep: axis.tickSize * prev } : axis;
}

/** Jump back to the last price and resume following it. */
export function snapToPrice(axis: PriceAxis): PriceAxis {
  return { ...axis, centerPrice: axis.lastPrice || axis.centerPrice, followMode: 'auto' };
}

/** Auto ⇄ locked; from manual it returns to auto (and re-centres). */
export function toggleFollowMode(axis: PriceAxis): PriceAxis {
  const followMode: FollowMode = axis.followMode === 'auto' ? 'locked' : 'auto';
  return {
    ...axis,
    followMode,
    centerPrice: followMode === 'auto' ? axis.lastPrice || axis.centerPrice : axis.centerPrice,
  };
}

/** Human-readable grouping, for the header. */
export function formatStep(step: number): string {
  if (step >= 1) return step.toFixed(0);
  if (step >= 0.1) return step.toFixed(1);
  if (step >= 0.01) return step.toFixed(2);
  return step.toFixed(4);
}
