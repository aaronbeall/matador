import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localDataApi } from './vite-plugins/localDataApi';
import { marketDataPlugin } from './vite-plugins/marketDataPlugin';

export default defineConfig({
  plugins: [react(), localDataApi(), marketDataPlugin()],
  server: {
    // Fixed, project-specific port — not the common 3000/5173 defaults —
    // so this can run in the background alongside other projects'
    // dev servers on this machine without a collision/auto-fallback.
    port: 7117,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});