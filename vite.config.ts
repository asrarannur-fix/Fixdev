import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // allow any host (quick tunnels / public demos). tighten for prod.
      allowedHosts: ['fixdev.web.id', 'www.fixdev.web.id', 'dev.fixdev.web.id'],
    },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "vendor-react";
          if (id.includes("node_modules/recharts")) return "vendor-charts";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules/motion")) return "vendor-motion";
          if (id.includes("node_modules/zod")) return "vendor-zod";
          if (id.includes("node_modules/redux") || id.includes("node_modules/react-redux")) return "vendor-redux";
        },
      },
    },
  },
  };
});
