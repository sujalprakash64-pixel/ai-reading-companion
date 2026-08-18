import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Main build: the service worker (loaded as an ES module) and the settings page.
// The content script is built separately (vite.content.config.ts) as a single
// self-contained IIFE, because MV3 content scripts load as classic scripts and
// cannot use ES `import`.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        settings: resolve(__dirname, 'src/settings/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
