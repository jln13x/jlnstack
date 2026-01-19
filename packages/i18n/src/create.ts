import type { TranslationDict, TranslationConfig } from "./types";
import { interpolate } from "./interpolate";

/**
 * Merge multiple translation dictionaries into one.
 */
function mergeDicts<T extends TranslationDict[]>(
  dicts: T,
): Record<string, Record<string, string>> {
  const merged: Record<string, Record<string, string>> = {};

  for (const dict of dicts) {
    for (const [key, value] of Object.entries(dict)) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Get translation value with fallback support.
 */
function getTranslation(
  dict: Record<string, Record<string, string>>,
  key: string,
  locale: string,
  fallbackLocale?: string,
): string {
  const entry = dict[key];
  if (!entry) return key;

  if (locale in entry) {
    return entry[locale] as string;
  }

  if (fallbackLocale && fallbackLocale in entry) {
    return entry[fallbackLocale] as string;
  }

  // Return first available translation or key
  const values = Object.values(entry);
  return values[0] ?? key;
}

type TranslateFn<Keys extends string> = (
  key: Keys,
  vars?: Record<string, string | number>,
) => string;

/**
 * Create a type-safe translation function.
 *
 * @example
 * ```ts
 * const auth = defineTranslations({
 *   login: { en: "Sign in", de: "Anmelden" },
 *   welcome: { en: "Hello, {name}!", de: "Hallo, {name}!" },
 * });
 *
 * const t = createTranslation({ locale: "en" }, auth);
 *
 * t("login"); // "Sign in"
 * t("welcome", { name: "John" }); // "Hello, John!"
 * ```
 */
export function createTranslation<T1 extends TranslationDict>(
  config: TranslationConfig,
  dict1: T1,
): TranslateFn<keyof T1 & string>;

export function createTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
>(
  config: TranslationConfig,
  dict1: T1,
  dict2: T2,
): TranslateFn<(keyof T1 | keyof T2) & string>;

export function createTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
>(
  config: TranslationConfig,
  dict1: T1,
  dict2: T2,
  dict3: T3,
): TranslateFn<(keyof T1 | keyof T2 | keyof T3) & string>;

export function createTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
  T4 extends TranslationDict,
>(
  config: TranslationConfig,
  dict1: T1,
  dict2: T2,
  dict3: T3,
  dict4: T4,
): TranslateFn<(keyof T1 | keyof T2 | keyof T3 | keyof T4) & string>;

export function createTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
  T4 extends TranslationDict,
  T5 extends TranslationDict,
>(
  config: TranslationConfig,
  dict1: T1,
  dict2: T2,
  dict3: T3,
  dict4: T4,
  dict5: T5,
): TranslateFn<(keyof T1 | keyof T2 | keyof T3 | keyof T4 | keyof T5) & string>;

export function createTranslation(
  config: TranslationConfig,
  ...dicts: TranslationDict[]
): TranslateFn<string> {
  const merged = mergeDicts(dicts);
  const { locale, fallbackLocale } = config;

  return (key, vars) => {
    const template = getTranslation(merged, key, locale, fallbackLocale);
    return interpolate(template, vars);
  };
}
