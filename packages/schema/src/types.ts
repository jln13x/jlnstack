import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Extract the input type from a StandardSchemaV1
 */
export type InferInput<T> = T extends StandardSchemaV1<infer I, unknown>
  ? I
  : never;

/**
 * Extract the output type from a StandardSchemaV1
 */
export type InferOutput<T> = T extends StandardSchemaV1<unknown, infer O>
  ? O
  : never;

/**
 * A migration from an older schema format to the current format
 */
export type Migration<TFrom, TTo> = {
  /**
   * The schema to validate the old format against
   */
  from: StandardSchemaV1<unknown, TFrom>;
  /**
   * Transform the old format to the current format
   */
  migrate: (value: TFrom) => TTo | Promise<TTo>;
};
