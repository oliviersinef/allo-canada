import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Vite assumes index.html is the entry point.
  // We specify both index.html and chat.html to ensure they are both processed.
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'chat.html')
      }
    }
  },
  server: {
    // Open browser automatically
    open: true
  }
});
