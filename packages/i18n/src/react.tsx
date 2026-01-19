"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TranslationDict, TranslationConfig } from "./types";
import { interpolate } from "./interpolate";

/**
 * Context for i18n locale state.
 */
interface I18nContextValue {
  locale: string;
  fallbackLocale?: string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Provider for i18n locale state.
 *
 * @example
 * ```tsx
 * <I18nProvider locale="en" fallbackLocale="en">
 *   <App />
 * </I18nProvider>
 * ```
 */
export interface I18nProviderProps {
  locale: string;
  fallbackLocale?: string;
  children: ReactNode;
  onLocaleChange?: (locale: string) => void;
}

export function I18nProvider({
  locale: initialLocale,
  fallbackLocale,
  children,
  onLocaleChange,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback(
    (newLocale: string) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange],
  );

  return (
    <I18nContext.Provider value={{ locale, fallbackLocale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Get the current locale from context.
 */
export function useLocale(): string {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLocale must be used within an I18nProvider");
  }
  return context.locale;
}

/**
 * Get the locale setter from context.
 */
export function useSetLocale(): (locale: string) => void {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useSetLocale must be used within an I18nProvider");
  }
  return context.setLocale;
}

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

  const values = Object.values(entry);
  return values[0] ?? key;
}

type TranslateFn<Keys extends string> = (
  key: Keys,
  vars?: Record<string, string | number>,
) => string;

/**
 * Hook to get a translation function for client components.
 *
 * @example
 * ```tsx
 * const auth = defineTranslations({
 *   login: { en: "Sign in", de: "Anmelden" },
 * });
 *
 * function LoginButton() {
 *   const t = useTranslation(auth);
 *   return <button>{t("login")}</button>;
 * }
 * ```
 */
export function useTranslation<T1 extends TranslationDict>(
  dict1: T1,
): TranslateFn<keyof T1 & string>;

export function useTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
>(dict1: T1, dict2: T2): TranslateFn<(keyof T1 | keyof T2) & string>;

export function useTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
>(
  dict1: T1,
  dict2: T2,
  dict3: T3,
): TranslateFn<(keyof T1 | keyof T2 | keyof T3) & string>;

export function useTranslation<
  T1 extends TranslationDict,
  T2 extends TranslationDict,
  T3 extends TranslationDict,
  T4 extends TranslationDict,
>(
  dict1: T1,
  dict2: T2,
  dict3: T3,
  dict4: T4,
): TranslateFn<(keyof T1 | keyof T2 | keyof T3 | keyof T4) & string>;

export function useTranslation<
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
): TranslateFn<
  (keyof T1 | keyof T2 | keyof T3 | keyof T4 | keyof T5) & string
>;

export function useTranslation(
  ...dicts: TranslationDict[]
): TranslateFn<string> {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }

  const { locale, fallbackLocale } = context;
  const merged = mergeDicts(dicts);

  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = getTranslation(merged, key, locale, fallbackLocale);
      return interpolate(template, vars);
    },
    [merged, locale, fallbackLocale],
  );
}
