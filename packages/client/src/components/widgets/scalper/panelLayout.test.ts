import { describe, it, expect } from 'vitest';
import {
  defaultLayout,
  mergeLayout,
  MIN_PANE_WIDTH,
  reorderPanes,
  resizePanes,
  visiblePanes,
  type PaneId,
} from './panelLayout';

describe('visiblePanes', () => {
  it('keeps the configured order and drops the hidden ones', () => {
    const layout = defaultLayout();
    expect(visiblePanes(layout)).toEqual(['cluster', 'bubble', 'orderbook']);
  });
});

describe('reorderPanes', () => {
  const order: PaneId[] = ['cluster', 'tick', 'bubble', 'orderbook', 'tape'];

  it('moves a pane to where the target sits', () => {
    expect(reorderPanes(order, 'orderbook', 'cluster')).toEqual([
      'orderbook', 'cluster', 'tick', 'bubble', 'tape',
    ]);
    expect(reorderPanes(order, 'cluster', 'bubble')).toEqual([
      'tick', 'bubble', 'cluster', 'orderbook', 'tape',
    ]);
  });

  it('is a no-op for the same pane or an unknown one', () => {
    expect(reorderPanes(order, 'cluster', 'cluster')).toBe(order);
    expect(reorderPanes(order, 'cluster', 'nope' as PaneId)).toBe(order);
  });
});

describe('resizePanes', () => {
  const widths = { cluster: 20, tick: 15, bubble: 15, orderbook: 30, tape: 20 };

  it('takes from one neighbour exactly what it gives the other', () => {
    const next = resizePanes(widths, 'cluster', 'bubble', 5);
    expect(next.cluster).toBe(25);
    expect(next.bubble).toBe(10);
    expect(next.cluster + next.bubble).toBe(widths.cluster + widths.bubble);
  });

  it('refuses to collapse either side below the minimum', () => {
    const grown = resizePanes(widths, 'cluster', 'bubble', 999);
    expect(grown.bubble).toBe(MIN_PANE_WIDTH);
    expect(grown.cluster).toBe(widths.cluster + widths.bubble - MIN_PANE_WIDTH);

    const shrunk = resizePanes(widths, 'cluster', 'bubble', -999);
    expect(shrunk.cluster).toBe(MIN_PANE_WIDTH);
  });

  it('returns the same object when nothing can move', () => {
    const pinned = { ...widths, cluster: MIN_PANE_WIDTH };
    expect(resizePanes(pinned, 'cluster', 'bubble', -5)).toBe(pinned);
  });
});

describe('mergeLayout', () => {
  it('falls back to defaults for missing input', () => {
    expect(mergeLayout(null)).toEqual(defaultLayout());
  });

  it('drops panes that no longer exist and appends ones that are new', () => {
    const merged = mergeLayout({ order: ['orderbook', 'ghost' as PaneId, 'cluster'] });
    expect(merged.order).toEqual(['orderbook', 'cluster', 'tick', 'bubble', 'tape']);
  });

  it('keeps stored visibility and widths over the defaults', () => {
    const merged = mergeLayout({ visible: { tape: true } as any, widths: { tape: 40 } as any });
    expect(merged.visible.tape).toBe(true);
    expect(merged.visible.cluster).toBe(true);
    expect(merged.widths.tape).toBe(40);
    expect(merged.widths.cluster).toBe(20);
  });
});
