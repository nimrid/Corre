import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000,
  },
  define: {
    // Add Buffer polyfill
    'process.env': {},
    'global': {},
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      // Add buffer polyfill
      'buffer': 'buffer/',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
}); 