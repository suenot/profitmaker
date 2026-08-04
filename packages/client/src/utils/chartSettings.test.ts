import { describe, expect, it } from 'vitest';
import { getCompatibleChartSymbol } from './chartSettings';

describe('getCompatibleChartSymbol', () => {
  it('keeps a pair that is available for the selected market', () => {
    expect(getCompatibleChartSymbol('BTC/USDT', ['ETH/USDT', 'BTC/USDT'])).toBe('BTC/USDT');
  });

  it('keeps the same base and quote when the market changes symbol format', () => {
    expect(getCompatibleChartSymbol('BTC/USDT:USDT', ['ETH/USDT', 'BTC/USDT'])).toBe('BTC/USDT');
  });

  it('switches to the first available pair when no equivalent exists', () => {
    expect(getCompatibleChartSymbol('SOL/USDT:USDT', ['ETH/USDT', 'BTC/USDT'])).toBe('ETH/USDT');
  });

  it('removes duplicate symbols and returns undefined for an empty market', () => {
    expect(getCompatibleChartSymbol('BTC/USDT', ['ETH/USDT', 'ETH/USDT'])).toBe('ETH/USDT');
    expect(getCompatibleChartSymbol('BTC/USDT', [])).toBeUndefined();
  });
});
