import { headers, cookies } from "next/headers";
import { cache } from "react";
import type { TranslationDict } from "./types";
import { interpolate } from "./interpolate";

/**
 * Configuration for Next.js i18n.
 */
export interface NextI18nConfig {
  /** Default locale when none detected */
  defaultLocale: string;
  /** Supported locales */
  locales: string[];
  /** Cookie name for locale preference */
  cookieName?: string;
  /** Fallback locale for missing translations */
  fallbackLocale?: string;
}

let globalConfig: NextI18nConfig | null = null;

/**
 * Configure i18n for Next.js.
 * Call this once in your app, typically in a layout or i18n config file.
 *
 * @example
 * ```ts
 * configureI18n({
 *   defaultLocale: "en",
 *   locales: ["en", "de", "fr"],
 *   cookieName: "locale",
 * });
 * ```
 */
export function configureI18n(config: NextI18nConfig): void {
  globalConfig = config;
}

/**
 * Get the configured i18n config.
 */
function getConfig(): NextI18nConfig {
  if (!globalConfig) {
    throw new Error(
      "i18n not configured. Call configureI18n() before using getLocale() or getTranslation().",
    );
  }
  return globalConfig;
}

/**
 * Parse Accept-Language header to get preferred locale.
 */
function parseAcceptLanguage(
  header: string | null,
  supportedLocales: string[],
): string | null {
  if (!header) return null;

  const locales = header
    .split(",")
    .map((part) => {
      const [locale = "", q = "q=1"] = part.trim().split(";");
      const quality = parseFloat(q.split("=")[1] ?? "1");
      return { locale: locale.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of locales) {
    // Exact match
    if (supportedLocales.includes(locale)) {
      return locale;
    }
    // Language-only match (e.g., "en-US" -> "en")
    const lang = locale.split("-")[0];
    if (lang && supportedLocales.includes(lang)) {
      return lang;
    }
  }

  return null;
}

/**
 * Get the current locale from cookies or Accept-Language header.
 * Uses React.cache() for request deduplication.
 *
 * @example
 * ```ts
 * // In a Server Component
 * const locale = await getLocale();
 * ```
 */
export const getLocale = cache(async (): Promise<string> => {
  const config = getConfig();
  const { defaultLocale, locales, cookieName = "locale" } = config;

  // 1. Check cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(cookieName);
  if (localeCookie && locales.includes(localeCookie.value)) {
    return localeCookie.value;
  }

  // 2. Parse Accept-Language header
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  const detected = parseAcceptLanguage(acceptLanguage, locales);
  if (detected) {
    return detected;
  }

  // 3. Fall back to default
  return defaultLocale;
});

/**
 * Merge multiple translation dictionaries into one.
 */
function mergeDicts(
  dicts: TranslationDict[],
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
function getTranslationValue(
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

  const values = Object.values(entry);
  return values[0] ?? key;
}

type TranslateFn<Keys extends string> = (
  key: Keys,
  vars?: Record<string, string | number>,
) => string;

/**
 * Get a translation function for use in Server Components.
 * Automatically detects locale from headers/cookies.
 *
 * @example
 * ```tsx
 * const auth = defineTranslations({
 *   login: { en: "Sign in", de: "Anmelden" },
 * });
 *
 * export default async function LoginPage() {
 *   const t = await getTranslation(auth);
 *   return <h1>{t("login")}</h1>;
 * }
 * ```
 */
export async function getTranslation<T1 extends TranslationDict>(
  dict1: T1,
): Promise<TranslateFn<keyof T1 & string>>;

export async function getTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
>(dict1: T1, dict2: T2): Promise<TranslateFn<(keyof T1 | keyof T2) & string>>;

export async function getTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
>(
  dict1: T1,
  dict2: T2,
  dict3: T3,
): Promise<TranslateFn<(keyof T1 | keyof T2 | keyof T3) & string>>;

export async function getTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
  T4 extends TranslationDict,
>(
  dict1: T1,
  dict2: T2,
  dict3: T3,
  dict4: T4,
): Promise<TranslateFn<(keyof T1 | keyof T2 | keyof T3 | keyof T4) & string>>;

export async function getTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
  T4 extends TranslationDict,
  T5 extends TranslationDict,
>(
  dict1: T1,
  dict2: T2,
  dict3: T3,
  dict4: T4,
  dict5: T5,
): Promise<
  TranslateFn<
    (keyof T1 | keyof T2 | keyof T3 | keyof T4 | keyof T5) & string
  >
>;

export async function getTranslation(
  ...dicts: TranslationDict[]
): Promise<TranslateFn<string>> {
  const config = getConfig();
  const locale = await getLocale();
  const merged = mergeDicts(dicts);
  const { fallbackLocale } = config;

  return (key: string, vars?: Record<string, string | number>) => {
    const template = getTranslationValue(merged, key, locale, fallbackLocale);
    return interpolate(template, vars);
  };
}

/**
 * Re-export locale utilities for convenience.
 */
export { interpolate } from "./interpolate";
export { defineTranslations } from "./define";
