import * as fs from "node:fs";
import * as path from "node:path";

interface LocaleData {
  [key: string]: string;
}

interface CheckResult {
  valid: boolean;
  missing: Array<{
    key: string;
    missingIn: string[];
  }>;
  locales: string[];
  totalKeys: number;
}

/**
 * Check for missing translations across locale files.
 */
export async function check(sourcePath: string): Promise<CheckResult> {
  const resolvedSource = path.resolve(process.cwd(), sourcePath);

  // Check if source exists
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Error: Source path does not exist: ${resolvedSource}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedSource);
  let jsonFiles: string[];

  if (stats.isDirectory()) {
    jsonFiles = fs
      .readdirSync(resolvedSource)
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(resolvedSource, file));
  } else {
    console.error("Error: Source must be a directory containing JSON files");
    process.exit(1);
  }

  if (jsonFiles.length === 0) {
    console.error("Error: No JSON files found");
    process.exit(1);
  }

  // Read all locale files
  const locales: Map<string, LocaleData> = new Map();
  const allKeys = new Set<string>();

  for (const file of jsonFiles) {
    const locale = path.basename(file, ".json");
    const content = fs.readFileSync(file, "utf-8");

    try {
      const data = JSON.parse(content) as LocaleData;
      locales.set(locale, data);

      for (const key of Object.keys(data)) {
        allKeys.add(key);
      }
    } catch {
      console.error(`Error: Failed to parse ${file}`);
      process.exit(1);
    }
  }

  // Check for missing keys
  const missing: CheckResult["missing"] = [];
  const localeNames = Array.from(locales.keys()).sort();

  for (const key of Array.from(allKeys).sort()) {
    const missingIn: string[] = [];

    for (const [locale, data] of locales) {
      if (!(key in data)) {
        missingIn.push(locale);
      }
    }

    if (missingIn.length > 0) {
      missing.push({ key, missingIn });
    }
  }

  // Output results
  console.log(`\nChecking translations in ${resolvedSource}`);
  console.log(`Locales: ${localeNames.join(", ")}`);
  console.log(`Total keys: ${allKeys.size}`);
  console.log("");

  if (missing.length === 0) {
    console.log("✓ All translations complete!");
  } else {
    console.log(`⚠ Missing translations:\n`);

    for (const { key, missingIn } of missing) {
      console.log(`  "${key}" missing in: ${missingIn.join(", ")}`);
    }

    console.log(`\n${missing.length} keys have missing translations`);
  }

  return {
    valid: missing.length === 0,
    missing,
    locales: localeNames,
    totalKeys: allKeys.size,
  };
}
