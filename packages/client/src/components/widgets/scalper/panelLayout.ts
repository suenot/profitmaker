/**
 * Pane bookkeeping for the scalper widget: which panes exist, in what order,
 * which are on, and how wide each is.
 *
 * Ported from scalper-iced (`src/message.rs` PanelId + the drag/resize handling
 * in `src/trading_panel.rs`, Unlicense). Kept as pure functions so the reorder
 * and resize rules are testable without a pointer.
 */

export type PaneId = 'cluster' | 'tick' | 'bubble' | 'orderbook' | 'tape';

export const PANE_LABELS: Record<PaneId, string> = {
  cluster: 'Cluster',
  tick: 'Ticks',
  bubble: 'Bubbles',
  orderbook: 'DOM',
  tape: 'Tape',
};

/** Ctrl+<n> toggles the pane at this position, as in the Rust app. */
export const PANE_ORDER_DEFAULT: PaneId[] = ['cluster', 'tick', 'bubble', 'orderbook', 'tape'];

export const PANE_VISIBLE_DEFAULT: Record<PaneId, boolean> = {
  cluster: true,
  tick: false,
  bubble: true,
  orderbook: true,
  tape: false,
};

/** Flex portions, not pixels — the widget is resizable and the panes follow. */
export const PANE_WIDTH_DEFAULT: Record<PaneId, number> = {
  cluster: 20,
  tick: 15,
  bubble: 15,
  orderbook: 30,
  tape: 20,
};

export const MIN_PANE_WIDTH = 5;

export interface PaneLayout {
  order: PaneId[];
  visible: Record<PaneId, boolean>;
  widths: Record<PaneId, number>;
}

export function defaultLayout(): PaneLayout {
  return {
    order: [...PANE_ORDER_DEFAULT],
    visible: { ...PANE_VISIBLE_DEFAULT },
    widths: { ...PANE_WIDTH_DEFAULT },
  };
}

export function visiblePanes(layout: PaneLayout): PaneId[] {
  return layout.order.filter(id => layout.visible[id]);
}

/** Move `dragged` to where `target` sits, keeping everything else in order. */
export function reorderPanes(order: PaneId[], dragged: PaneId, target: PaneId): PaneId[] {
  if (dragged === target) return order;
  const from = order.indexOf(dragged);
  const to = order.indexOf(target);
  if (from < 0 || to < 0) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

/**
 * Move the divider between two neighbouring panes: one gives up exactly what
 * the other takes, so the total stays put and no pane collapses.
 */
export function resizePanes(
  widths: Record<PaneId, number>,
  left: PaneId,
  right: PaneId,
  deltaPortions: number,
): Record<PaneId, number> {
  const leftWidth = widths[left];
  const rightWidth = widths[right];
  const clamped = Math.max(
    MIN_PANE_WIDTH - leftWidth,
    Math.min(rightWidth - MIN_PANE_WIDTH, deltaPortions),
  );
  if (!clamped) return widths;
  return { ...widths, [left]: leftWidth + clamped, [right]: rightWidth - clamped };
}

/** Restores a stored layout, dropping anything that no longer exists. */
export function mergeLayout(stored: Partial<PaneLayout> | null | undefined): PaneLayout {
  const base = defaultLayout();
  if (!stored) return base;
  const order = Array.isArray(stored.order)
    ? [
        ...stored.order.filter((id): id is PaneId => id in PANE_LABELS),
        ...base.order.filter(id => !stored.order!.includes(id)),
      ]
    : base.order;
  return {
    order,
    visible: { ...base.visible, ...(stored.visible ?? {}) },
    widths: { ...base.widths, ...(stored.widths ?? {}) },
  };
}
