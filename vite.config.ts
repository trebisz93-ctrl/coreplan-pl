import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

export default defineConfig(({ mode, isSsrBuild }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: isSsrBuild
      ? {}
      : {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-query': ['@tanstack/react-query'],
              'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
              'vendor-supabase': ['@supabase/supabase-js'],
            },
          },
        },
  },
}));
