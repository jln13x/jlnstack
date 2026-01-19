export type {
  TranslationValue,
  TranslationDict,
  ExtractVars,
  TranslationKeys,
  MergeTranslationKeys,
  GetTranslationValue,
  HasVars,
  TranslateFn,
  TranslationConfig,
} from "./types";

export { defineTranslations } from "./define";
export { interpolate } from "./interpolate";
export { createTranslation } from "./create";
