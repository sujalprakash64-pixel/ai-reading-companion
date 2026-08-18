import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Content script build: a single self-contained IIFE with no imports, since MV3
// content scripts load as classic scripts. Runs after the main build, so it must
// NOT empty the output directory.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'AICompanion',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
});
