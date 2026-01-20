import { defineConfig } from "tsdown";

export default defineConfig({
  target: ["node18", "es2017"],
  entry: [
    "src/index.ts",
    "src/adapters/upstash.ts",
    "src/adapters/redis.ts",
    "src/react/index.tsx",
    "src/next/index.ts",
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
