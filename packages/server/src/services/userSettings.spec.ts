import { describe, expect, it } from 'vitest';
import { getOptionalUserSettingDefault } from './userSettings';

describe('getOptionalUserSettingDefault', () => {
  it('provides an empty disabled-widget list when the setting was never persisted', () => {
    expect(getOptionalUserSettingDefault('builtinWidgets.disabled')).toEqual({
      defined: true,
      value: [],
    });
  });

  it('does not turn unknown settings into successful reads', () => {
    expect(getOptionalUserSettingDefault('unknown.setting')).toEqual({ defined: false });
  });

  it('returns an isolated mutable value for each request', () => {
    const first = getOptionalUserSettingDefault('builtinWidgets.disabled');
    const second = getOptionalUserSettingDefault('builtinWidgets.disabled');

    expect(first.defined).toBe(true);
    expect(second.defined).toBe(true);
    if (first.defined && second.defined) {
      expect(first.value).not.toBe(second.value);
    }
  });
});
