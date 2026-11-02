import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) return 'react-vendor';
          if (id.includes('/@supabase/')) return 'supabase-vendor';
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/html-to-image/')) return 'image-export';
        }
      }
    }
  }
});
