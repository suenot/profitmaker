type UserSettingDefault = { defined: true; value: unknown } | { defined: false };

/**
 * Defaults for optional user settings that must work before a row is persisted.
 * Factories keep mutable defaults isolated between requests.
 */
const optionalUserSettingDefaults = new Map<string, () => unknown>([
  ['builtinWidgets.disabled', () => []],
]);

export function getOptionalUserSettingDefault(key: string): UserSettingDefault {
  const createDefault = optionalUserSettingDefaults.get(key);
  return createDefault
    ? { defined: true, value: createDefault() }
    : { defined: false };
}
