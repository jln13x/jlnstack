import { defineConfig } from "tsdown";

const plugins = ["history", "immer", "logger", "reset"];

export default defineConfig({
  target: ["node18", "es2017"],
  entry: [
    "src/core/core.ts",
    ...plugins.map((plugin) => `src/core/plugins/${plugin}/index.ts`),
    "src/react/react.tsx",
  ],
  dts: {
    sourcemap: true,
  },
  unbundle: true,
  format: ["cjs", "esm"],
  outExtensions: (ctx) => ({
    dts: ctx.format === "cjs" ? ".d.cts" : ".d.mts",
    js: ctx.format === "cjs" ? ".cjs" : ".mjs",
  }),
  ignoreWatch: ["dist", ".turbo"],
});
