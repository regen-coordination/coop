import path from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.ANALYZE === 'true'
      ? [
          visualizer({
            filename: path.resolve(__dirname, '../../stats-app.html'),
            template: 'treemap',
            gzipSize: true,
            open: false,
          }),
        ]
      : []),
  ],
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@coop/shared': path.resolve(__dirname, '../shared/src/app-entry.ts'),
      '@coop/api': path.resolve(__dirname, '../api/config.ts'),
    },
  },
  build: {
    sourcemap: 'hidden',
    target: 'es2022',
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
  },
});
