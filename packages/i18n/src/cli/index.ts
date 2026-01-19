#!/usr/bin/env node

import cac from "cac";
import { migrate } from "./migrate";
import { check } from "./check";
import { studio } from "./studio";

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

cli
  .command("studio <translations>", "Launch visual translation editor")
  .option("-p, --port <port>", "Port to run on", { default: 4200 })
  .option("-l, --locales <locales>", "Comma-separated list of locales", {
    default: "en",
  })
  .action(
    async (
      translations: string,
      options: { port: number | string; locales: string },
    ) => {
      const port =
        typeof options.port === "string"
          ? parseInt(options.port, 10)
          : options.port;
      const locales = options.locales.split(",").map((l) => l.trim());
      await studio(translations, { port, locales });
    },
  );

cli.help();
cli.version("0.0.0");

cli.parse();
