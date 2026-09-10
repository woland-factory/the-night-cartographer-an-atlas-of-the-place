import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Client-only SPA. No backend, no proxy. Runtime config arrives via
// public/config.js (dev) or the container entrypoint (staging), never
// baked into the build.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
});
