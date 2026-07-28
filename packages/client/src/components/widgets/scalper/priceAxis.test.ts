import { describe, it, expect } from 'vitest';
import {
  createPriceAxis,
  formatStep,
  priceToRow,
  priceToY,
  snapToPrice,
  toggleFollowMode,
  visiblePriceRange,
  withLastPrice,
  withPriceStep,
  withScroll,
  withZoom,
  yToPrice,
  MAX_ROW_HEIGHT,
  MIN_ROW_HEIGHT,
} from './priceAxis';

const axis = () => ({ ...createPriceAxis(0.1, 1), centerPrice: 100, lastPrice: 100, rowHeight: 20 });

describe('price ↔ y', () => {
  it('puts the centre price in the middle and higher prices above', () => {
    const a = axis();
    expect(priceToY(a, 100, 400)).toBe(200);
    expect(priceToY(a, 101, 400)).toBe(180);
    expect(priceToY(a, 99, 400)).toBe(220);
  });

  it('round-trips through yToPrice', () => {
    const a = axis();
    for (const price of [100, 103.5, 97]) {
      expect(yToPrice(a, priceToY(a, price, 400), 400)).toBeCloseTo(price, 10);
    }
  });

  it('counts rows from the centre, positive downwards', () => {
    const a = axis();
    expect(priceToRow(a, 100)).toBe(0);
    expect(priceToRow(a, 97)).toBe(3);
    expect(priceToRow(a, 102)).toBe(-2);
  });

  it('reports the visible range from the row count', () => {
    const { high, low } = visiblePriceRange(axis(), 400); // 20 rows of 1
    expect(high).toBe(110);
    expect(low).toBe(90);
  });
});

describe('follow modes', () => {
  it('re-centres on a new price only in auto', () => {
    expect(withLastPrice(axis(), 105).centerPrice).toBe(105);
    expect(withLastPrice({ ...axis(), followMode: 'locked' }, 105).centerPrice).toBe(100);
    expect(withLastPrice({ ...axis(), followMode: 'manual' }, 105).centerPrice).toBe(100);
  });

  it('centres the first price even when not following', () => {
    const fresh = { ...createPriceAxis(0.1, 1), followMode: 'locked' as const };
    expect(withLastPrice(fresh, 42).centerPrice).toBe(42);
  });

  it('ignores a garbage price', () => {
    const a = axis();
    expect(withLastPrice(a, 0)).toBe(a);
    expect(withLastPrice(a, Number.NaN)).toBe(a);
  });

  it('panning takes over from auto but leaves locked alone', () => {
    expect(withScroll(axis(), 2).followMode).toBe('manual');
    expect(withScroll(axis(), 2).centerPrice).toBe(102);
    expect(withScroll({ ...axis(), followMode: 'locked' }, 2).followMode).toBe('locked');
  });

  it('snap returns to the last price and to auto', () => {
    const panned = withScroll(axis(), -5);
    const snapped = snapToPrice(panned);
    expect(snapped.centerPrice).toBe(100);
    expect(snapped.followMode).toBe('auto');
  });

  it('toggles auto ⇄ locked, and manual back to auto', () => {
    expect(toggleFollowMode(axis()).followMode).toBe('locked');
    expect(toggleFollowMode({ ...axis(), followMode: 'locked' }).followMode).toBe('auto');
    const fromManual = toggleFollowMode({ ...axis(), followMode: 'manual', centerPrice: 90 });
    expect(fromManual.followMode).toBe('auto');
    expect(fromManual.centerPrice).toBe(100);
  });
});

describe('zoom and grouping', () => {
  it('clamps row height to the theme bounds', () => {
    let a = axis();
    for (let i = 0; i < 50; i++) a = withZoom(a, 1);
    expect(a.rowHeight).toBe(MAX_ROW_HEIGHT);
    for (let i = 0; i < 50; i++) a = withZoom(a, -1);
    expect(a.rowHeight).toBe(MIN_ROW_HEIGHT);
  });

  it('walks the grouping ladder in both directions', () => {
    const a = { ...createPriceAxis(0.1, 0.1), centerPrice: 100 }; // ×1
    const up = withPriceStep(a, 1);
    expect(up.displayStep).toBeCloseTo(0.15, 10); // ×1.5
    expect(withPriceStep(up, -1).displayStep).toBeCloseTo(0.1, 10);
  });

  it('stops at the ends of the ladder', () => {
    const finest = { ...createPriceAxis(0.1, 0.1), centerPrice: 100 };
    expect(withPriceStep(finest, -1)).toBe(finest);
    const coarsest = { ...createPriceAxis(0.1, 1000), centerPrice: 100 };
    expect(withPriceStep(coarsest, 1)).toBe(coarsest);
  });
});

describe('formatStep', () => {
  it('shows as many decimals as the step needs', () => {
    expect(formatStep(5)).toBe('5');
    expect(formatStep(0.5)).toBe('0.5');
    expect(formatStep(0.05)).toBe('0.05');
    expect(formatStep(0.0005)).toBe('0.0005');
  });
});
