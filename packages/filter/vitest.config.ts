import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "dist"],
    typecheck: {
      enabled: true,
    },
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
