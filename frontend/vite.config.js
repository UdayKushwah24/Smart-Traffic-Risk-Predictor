import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_API_URL;
const proxy = proxyTarget
  ? {
      '/api': proxyTarget,
      '/auth': proxyTarget,
      '/kid-safety': proxyTarget,
      '/ws': proxyTarget,
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
});
