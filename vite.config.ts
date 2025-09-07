import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Prevent Electron-specific native module from being bundled in web builds
      'agora-electron-sdk': path.resolve(__dirname, './src/shims/emptyModule.ts'),
      // Map webpack-style worker-loader request used by agora-rte-sdk to our local adapter
      'worker-loader?inline=no-fallback!./worker-entry': path.resolve(__dirname, './src/shims/agora-worker-adapter.ts'),
      'agora-rte-sdk/lib/core/worker/worker-entry.js': path.resolve(__dirname, './src/shims/agora-worker-entry.ts'),
    },
  },
  build: {
    outDir: 'build',
  },
});