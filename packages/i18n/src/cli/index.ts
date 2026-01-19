#!/usr/bin/env node

import cac from "cac";
import { migrate } from "./migrate";
import { check } from "./check";

const cli = cac("i18n");

cli
  .command("migrate <source>", "Migrate JSON locale files to TypeScript")
  .option("-o, --output <path>", "Output file path", {
    default: "translations.ts",
  })
  .action(async (source: string, options: { output: string }) => {
    await migrate(source, options.output);
  });

cli
  .command("check <path>", "Check for missing translations")
  .option("--strict", "Exit with error code if missing translations found")
  .action(async (path: string, options: { strict?: boolean }) => {
    const result = await check(path);
    if (options.strict && !result.valid) {
      process.exit(1);
    }
  });

cli.help();
cli.version("0.0.0");

cli.parse();
