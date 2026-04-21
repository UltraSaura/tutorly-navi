import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        // Allow serving files from the project root
        path.resolve(__dirname, "."),
        // Allow serving files from node_modules (for MathLive fonts)
        path.resolve(__dirname, "node_modules"),
      ],
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui/')) return 'vendor-radix';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers') ||
              id.match(/[\\/]node_modules[\\/]zod[\\/]/)
            ) return 'vendor-forms';
            if (
              id.includes('i18next-browser-languagedetector') ||
              id.includes('react-i18next') ||
              id.match(/[\\/]node_modules[\\/]i18next[\\/]/)
            ) return 'vendor-i18n';
            if (id.includes('mathlive')) return 'mathlive';
            if (
              id.match(/[\\/]node_modules[\\/]react[\\/]/) ||
              id.match(/[\\/]node_modules[\\/]react-dom[\\/]/)
            ) return 'react';
          }
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  }
}));
