import { defineConfig } from 'vite';

export default defineConfig({
  // manifold-3d carrega o .wasm via import.meta.url — não pode ser pré-empacotado
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: { target: 'esnext' },
  esbuild: { target: 'esnext' },
  server: { port: 5199, open: false },
});
