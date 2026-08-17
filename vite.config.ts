import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localDataApi } from './vite-plugins/localDataApi';

export default defineConfig({
  plugins: [react(), localDataApi()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});