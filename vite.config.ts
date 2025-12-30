import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import electron from "vite-plugin-electron";
import electronRenderer from "vite-plugin-electron-renderer";

// Check if we're building for Electron
const isElectron = process.env.ELECTRON === 'true';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Electron plugins only when building for Electron
    isElectron && electron([
      {
        // Main process entry point
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: mode === 'development',
            minify: mode === 'production',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // Preload script entry point
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: mode === 'development',
            minify: mode === 'production',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    isElectron && electronRenderer(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    // For Electron, output to dist folder
    outDir: isElectron ? 'dist' : 'dist',
    rollupOptions: {
      external: isElectron ? [] : [
        // Node.js modules that don't exist in browser (only exclude for web build)
        'http-proxy-agent',
        'https-proxy-agent',
        'socks-proxy-agent',
        'ws',
        'crypto',
        'fs',
        'path',
        'url',
        'zlib',
        'stream',
        'buffer',
        'util',
        'querystring',
        'http',
        'https',
        'net',
        'tls',
        'events',
        'assert',
      ],
    },
  },
  optimizeDeps: {
    // Don't preload CCXT due to complex dependencies
    exclude: ['ccxt'],
    // Include only necessary polyfills
    include: ['buffer', 'process'],
  },
  // Settings for browser compatibility
  esbuild: {
    define: {
      global: 'globalThis',
    },
  },
}));
