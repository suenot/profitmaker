import { defineConfig } from 'vite';
import { profitmakerModule } from '@profitmaker/module-sdk/vite';

// The preset aliases react / react-dom / zustand / @profitmaker/module-sdk to
// the host's runtime shims (one React instance, host singletons) and builds an
// ES-module bundle to dist/frontend/index.js. See @profitmaker/module-sdk/vite.
export default defineConfig(profitmakerModule());
