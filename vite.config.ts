import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo-name>/. Override via VITE_BASE at build time
// if the repo name differs, e.g. VITE_BASE=/lvgl-tool/ npm run build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    target: 'es2020',
  },
});
