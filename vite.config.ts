import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    /** Server tests share a DB singleton — run test files sequentially. */
    fileParallelism: false
  }
});
