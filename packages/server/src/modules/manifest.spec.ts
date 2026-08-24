import { describe, it, expect } from 'vitest';
import { ModuleManifestSchema } from '@profitmaker/module-sdk';

/**
 * A module named "host" would own every built-in widget's registry entry
 * (HOST_OWNER in the client registry): hiding it in the Module Store would
 * unregister every built-in widget, including the Module Store itself. The
 * schema is the gate — both install paths in manager.ts parse through it.
 */

const manifest = (id: string) => ({
  manifestVersion: 1 as const,
  id,
  displayName: 'X',
  backend: { entry: 'dist/backend/index.js' },
});

describe('ModuleManifestSchema reserved module ids', () => {
  it('rejects a manifest whose id is "host"', () => {
    expect(() => ModuleManifestSchema.parse(manifest('host'))).toThrowError(/reserved/);
  });

  it('accepts an id that merely starts with "host"', () => {
    expect(ModuleManifestSchema.parse(manifest('host-reporting')).id).toBe('host-reporting');
  });
});
