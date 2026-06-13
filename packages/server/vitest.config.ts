import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @profitmaker/server.
 *
 * - Only picks up the new *.spec.ts files. The legacy src/routes/proxy.test.ts
 *   uses the `bun:test` runner (run via `bun test`), which is incompatible with
 *   vitest's import of `bun:test`; excluding *.test.ts keeps the two runners
 *   from colliding.
 * - setup/loadEnv.ts loads the gitignored repo-root .env (for the integration
 *   suite) and provides a dummy DATABASE_URL so importing modules that touch the
 *   db client doesn't throw at load time (no query is ever issued in unit tests).
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', 'src/routes/proxy.test.ts'],
    setupFiles: ['./test/setup/loadEnv.ts'],
    environment: 'node',
    // The live integration suite talks to real services; give it room.
    testTimeout: 30_000,
  },
});
