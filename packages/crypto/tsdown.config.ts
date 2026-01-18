import { defineConfig } from "tsdown";

export default defineConfig({
  target: ["node18", "es2017"],
  entry: ["src/index.ts", "src/jwt/index.ts", "src/encrypt/index.ts"],
  dts: {
    sourcemap: true,
    tsconfig: "./tsconfig.json",
  },
  unbundle: true,
  format: ["cjs", "esm"],
  outExtensions: (ctx) => ({
    dts: ctx.format === "cjs" ? ".d.cts" : ".d.mts",
    js: ctx.format === "cjs" ? ".cjs" : ".mjs",
  }),
});
