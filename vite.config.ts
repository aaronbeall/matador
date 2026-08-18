import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localDataApi } from './vite-plugins/localDataApi';
import { marketDataPlugin } from './vite-plugins/marketDataPlugin';

export default defineConfig({
  plugins: [react(), localDataApi(), marketDataPlugin()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});