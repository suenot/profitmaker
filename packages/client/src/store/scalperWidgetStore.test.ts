import { describe, it, expect, beforeEach } from 'vitest';
import { useScalperWidgetsStore } from './scalperWidgetStore';

/**
 * These guard the store's use as a zustand selector. `getWidget` is what React
 * reads as the render snapshot, so an untouched widget must get the same object
 * back every time — returning a fresh default per call re-rendered the widget
 * forever ("Maximum update depth exceeded", a white screen for the whole app).
 */

beforeEach(() => {
  useScalperWidgetsStore.setState({ widgets: {} });
});

describe('getWidget', () => {
  it('returns one stable reference for a widget with no stored state', () => {
    const { getWidget } = useScalperWidgetsStore.getState();
    expect(getWidget('w1')).toBe(getWidget('w1'));
    expect(getWidget('w1')).toBe(getWidget('w2'));
  });

  it('returns the stored state once the widget has been touched', () => {
    const store = useScalperWidgetsStore.getState();
    store.updateWidget('w1', { quantity: '5' });
    const stored = useScalperWidgetsStore.getState().getWidget('w1');
    expect(stored.quantity).toBe('5');
    expect(useScalperWidgetsStore.getState().getWidget('w1')).toBe(stored);
    // Another widget is unaffected and still on the shared default.
    expect(useScalperWidgetsStore.getState().getWidget('w2').quantity).toBe('0.001');
  });
});

describe('updates never touch the shared default', () => {
  it('toggling a pane on an untouched widget leaves other widgets alone', () => {
    const store = useScalperWidgetsStore.getState();
    store.togglePane('w1', 'tape');
    const after = useScalperWidgetsStore.getState();
    expect(after.getWidget('w1').layout.visible.tape).toBe(true);
    expect(after.getWidget('w2').layout.visible.tape).toBe(false);
  });

  it('toggling a bottom section on an untouched widget leaves other widgets alone', () => {
    const store = useScalperWidgetsStore.getState();
    store.toggleBottomSection('w1', 'pnl');
    const after = useScalperWidgetsStore.getState();
    expect(after.getWidget('w1').bottomVisible.pnl).toBe(false);
    expect(after.getWidget('w2').bottomVisible.pnl).toBe(true);
  });

  it('forgets a widget on removal', () => {
    const store = useScalperWidgetsStore.getState();
    store.updateWidget('w1', { quantity: '9' });
    useScalperWidgetsStore.getState().removeWidget('w1');
    expect(useScalperWidgetsStore.getState().getWidget('w1').quantity).toBe('0.001');
  });
});
