import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".vercel"],
    // Vitest 4: pool config é top-level
    pool: "threads",
    isolate: false,
    singleThread: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".vercel/",
        "**/*.config.{ts,js}",
        "**/types.ts",
        "src/test/**",
      ],
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
});


