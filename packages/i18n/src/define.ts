import type { TranslationValue } from "./types";

/**
 * Helper to define translations with proper type inference.
 * Returns both the full dictionary and individual exports for tree-shaking.
 *
 * @example
 * ```ts
 * export const auth = defineTranslations({
 *   login: { en: "Sign in", de: "Anmelden" },
 *   logout: { en: "Sign out", de: "Abmelden" },
 * });
 *
 * // Destructure for tree-shaking
 * export const { login, logout } = auth;
 * ```
 */
export function defineTranslations<
  T extends Record<string, TranslationValue>,
>(translations: T): T {
  return translations;
}
