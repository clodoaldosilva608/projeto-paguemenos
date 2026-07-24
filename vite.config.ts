import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    nitro: { preset: "vercel" },
  },
  vite: {
    build: { rollupOptions: {} },
    server: {
      allowedHosts: true,
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
    },
  },
});
