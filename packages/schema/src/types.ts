import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A value that may or may not be a Promise.
 * Used internally to support both sync and async operations.
 * @internal
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Chain operations that may be sync or async.
 * If the input is a Promise, returns a Promise. Otherwise returns sync.
 * @internal
 */
export function andThen<T, U>(
  value: MaybePromise<T>,
  fn: (v: T) => MaybePromise<U>,
): MaybePromise<U> {
  if (value instanceof Promise) {
    return value.then(fn);
  }
  return fn(value);
}

/**
 * Extract the output type from a StandardSchemaV1.
 * @internal
 */
export type InferOutput<T> = T extends StandardSchemaV1<unknown, infer O>
  ? O
  : never;

/**
 * The versioned data wrapper format.
 * All versioned data is stored/transmitted in this shape.
 * Version is a number derived from the migration chain position.
 */
export type VersionedData<T> = {
  version: number;
  data: T;
};

/**
 * A version migration definition.
 * The version is implicit based on position in the migrations array:
 * - migrations[0] = version 1 (migrates to version 2)
 * - migrations[1] = version 2 (migrates to version 3)
 * - etc.
 */
export type VersionMigration<TData = unknown> = {
  /**
   * The schema to validate data at this version
   */
  schema: StandardSchemaV1<unknown, TData>;
  /**
   * Transform data from this version to the next version.
   * The last migration's `up` should return data matching the current schema.
   */
  up: (data: TData) => unknown | Promise<unknown>;
};

/**
 * Configuration for createVersionedSchema.
 * The current version is derived from migrations.length + 1.
 */
export type VersionedSchemaConfig<TSchema extends StandardSchemaV1> = {
  /**
   * The current schema (source of truth)
   */
  schema: TSchema;
  /**
   * Migrations from older versions, ordered from oldest to newest.
   * - migrations[0] handles version 1 data and upgrades to version 2
   * - migrations[1] handles version 2 data and upgrades to version 3
   * - etc.
   * Each migration's `up` function should transform to the NEXT version's format.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrations?: VersionMigration<any>[];
  /**
   * If true, accept data without the { version, data } wrapper
   * and treat it as version 1.
   */
  allowUnversioned?: boolean;
};
