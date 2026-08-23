import { defineConfig } from 'vite';
import { profitmakerModule } from '@profitmaker/module-sdk/vite';

const preset = profitmakerModule();

export default defineConfig({
  ...preset,
  // Under vitest, drop the host-runtime shims (react -> window.__PROFITMAKER__
  // singletons): tests link the real react and the SDK's TS source directly,
  // with a fake __PROFITMAKER__ installed per test. The shims exist so the
  // PUBLISHED bundle borrows the host's single React instance — a build-only
  // concern.
  ...(process.env.VITEST ? { resolve: { alias: [] } } : {}),
});
