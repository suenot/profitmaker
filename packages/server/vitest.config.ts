import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @profitmaker/server.
 *
 * - Picks up both Vitest naming conventions used by the server suite.
 * - setup/loadEnv.ts loads the gitignored repo-root .env (for the integration
 *   suite) and provides a dummy DATABASE_URL so importing modules that touch the
 *   db client doesn't throw at load time (no query is ever issued in unit tests).
 */
export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts', 'test/**/*.{spec,test}.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/setup/loadEnv.ts'],
    environment: 'node',
    // The live integration suite talks to real services; give it room.
    testTimeout: 30_000,
  },
});
