import { defineConfig } from "tsdown";

export default defineConfig({
  target: ["node18", "es2017"],
  entry: [
    "src/core/core.ts",
    "src/core/plugins/index.ts",
    "src/react/react.tsx",
    "src/react/plugins/index.ts",
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
});
