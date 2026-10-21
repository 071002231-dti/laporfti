import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Lets production serve the app from a subpath (e.g. "/lapor/") behind a
    // reverse proxy without hardcoding it — set VITE_BASE_PATH at build time.
    base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/lapor/' : '/'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': 'http://localhost:8787',
        '/uploads': 'http://localhost:8787',
      },
    },
  };
});
