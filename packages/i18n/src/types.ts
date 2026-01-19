/**
 * A single translation value across locales
 * e.g., { en: "Hello", de: "Hallo" }
 */
export type TranslationValue = Record<string, string>;

/**
 * A dictionary of translations
 * e.g., { greeting: { en: "Hello", de: "Hallo" } }
 */
export type TranslationDict = Record<string, TranslationValue>;

/**
 * Extract interpolation variables from a translation string
 * e.g., "Hello, {name}!" -> "name"
 */
export type ExtractVars<S extends string> =
  S extends `${string}{${infer Var}}${infer Rest}`
    ? Var | ExtractVars<Rest>
    : never;

/**
 * Get all keys from a translation dictionary
 */
export type TranslationKeys<T extends TranslationDict> = keyof T & string;

/**
 * Merge multiple translation dictionaries into a single key union
 */
export type MergeTranslationKeys<T extends TranslationDict[]> =
  T[number] extends infer D
    ? D extends TranslationDict
      ? keyof D & string
      : never
    : never;

/**
 * Get the translation value type for a specific key across merged dicts
 */
export type GetTranslationValue<
  T extends TranslationDict[],
  K extends string,
> = T[number] extends infer D
  ? D extends TranslationDict
    ? K extends keyof D
      ? D[K]
      : never
    : never
  : never;

/**
 * Check if a string has interpolation variables
 */
export type HasVars<S extends string> = ExtractVars<S> extends never
  ? false
  : true;

/**
 * The translation function signature
 */
export type TranslateFn<T extends TranslationDict[]> = <
  K extends MergeTranslationKeys<T>,
>(
  key: K,
  ...args: ExtractVars<
    GetTranslationValue<T, K>[string]
  > extends never
    ? []
    : [vars: Record<ExtractVars<GetTranslationValue<T, K>[string]>, string | number>]
) => string;

/**
 * Configuration for translation functions
 */
export interface TranslationConfig {
  locale: string;
  fallbackLocale?: string;
}
