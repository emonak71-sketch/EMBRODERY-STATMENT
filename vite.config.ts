import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        customer: resolve(root, 'index.html'),
        owner: resolve(root, 'owner.html'),
        downloads: resolve(root, 'download.html'),
        features: resolve(root, 'features.html'),
      },
    },
  },
});
