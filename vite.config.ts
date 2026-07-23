import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo-name>/. Override via VITE_BASE at build time
// if the repo name differs, e.g. VITE_BASE=/lvgl-tool/ npm run build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    target: 'es2020',
  },
  server: {
    // Bind all interfaces by default so the dev server is reachable from outside a container
    // without needing to remember the --host flag; harmless for plain local `npm run dev` too.
    host: true,
    port: 5173,
  },
});
