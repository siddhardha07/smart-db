/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mock Monaco editor for tests
      "monaco-editor": new URL(
        "__tests__/mocks/monaco-editor.js",
        import.meta.url
      ).pathname,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "**/*.d.ts",
        "vite.config.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
});
