import { beforeEach, describe, expect, it } from 'vitest';
import { getBuiltinDefinition, registerBuiltinWidgets } from './builtinWidgets';
import { useWidgetRegistry } from './registry';

beforeEach(() => {
  useWidgetRegistry.setState({ definitions: {}, owners: {} });
  registerBuiltinWidgets();
});

describe('built-in widget group selectors', () => {
  it('keeps group selectors on public instrument widgets', () => {
    for (const type of ['chart', 'orderbook', 'trades', 'footprint', 'heatmap']) {
      expect(getBuiltinDefinition(type)?.showGroupSelector, type).toBe(true);
    }
  });

  it('does not offer an instrument group on cross-account private views', () => {
    for (const type of ['portfolio', 'transactionHistory', 'custom']) {
      expect(getBuiltinDefinition(type)?.showGroupSelector, type).toBe(false);
    }
  });
});
