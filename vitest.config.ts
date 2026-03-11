import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@coop/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'packages/app/src/**/*.test.{ts,tsx}',
      'packages/extension/src/**/*.test.{ts,tsx}',
      'packages/shared/src/**/*.test.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
