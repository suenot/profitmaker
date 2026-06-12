import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Vite preset for building a Profitmaker module's frontend bundle.
 *
 * Aliases react/react-dom/zustand/the SDK to tiny runtime shims that
 * re-export the host's singletons from `window.__PROFITMAKER__`
 * (Obsidian/Grafana-style). This guarantees one React instance — module
 * hooks and zustand stores just work — with zero changes to the host build.
 *
 * Usage in a module's vite.config.ts:
 *
 *   import { defineConfig } from 'vite';
 *   import { profitmakerModule } from '@profitmaker/module-sdk/vite';
 *   export default defineConfig(profitmakerModule());
 */
export function profitmakerModule(options?: {
  /** Frontend entry, default 'src/frontend/index.tsx' */
  entry?: string;
  /** Output dir, default 'dist/frontend' */
  outDir?: string;
}) {
  const runtimeDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../runtime'
  );
  const shim = (name: string) => path.join(runtimeDir, `${name}.js`);

  return {
    resolve: {
      alias: [
        { find: /^react$/, replacement: shim('react') },
        { find: /^react\/jsx-runtime$/, replacement: shim('jsx-runtime') },
        { find: /^react\/jsx-dev-runtime$/, replacement: shim('jsx-dev-runtime') },
        { find: /^react-dom$/, replacement: shim('react-dom') },
        { find: /^react-dom\/client$/, replacement: shim('react-dom-client') },
        { find: /^zustand$/, replacement: shim('zustand') },
        { find: /^@profitmaker\/module-sdk$/, replacement: shim('sdk') },
      ],
    },
    build: {
      outDir: options?.outDir ?? 'dist/frontend',
      emptyOutDir: true,
      lib: {
        entry: options?.entry ?? 'src/frontend/index.tsx',
        formats: ['es' as const],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: { inlineDynamicImports: true },
      },
    },
  };
}
