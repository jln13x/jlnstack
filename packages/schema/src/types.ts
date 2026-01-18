import type { StandardSchemaV1 } from "@standard-schema/spec";

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
 */
export type VersionedData<T> = {
  version: string;
  data: T;
};

/**
 * A version migration definition.
 * Defines a schema for a specific version and how to migrate UP to the next version.
 */
export type VersionMigration<TData = unknown> = {
  /**
   * The version identifier (e.g., "1", "2", "1.0.0")
   */
  version: string;
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
 * Configuration for createVersionedSchema
 */
export type VersionedSchemaConfig<TSchema extends StandardSchemaV1> = {
  /**
   * The current version identifier
   */
  version: string;
  /**
   * The current schema (source of truth)
   */
  schema: TSchema;
  /**
   * Migrations from older versions, ordered from oldest to newest.
   * Each migration's `up` function should transform to the NEXT version's format.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrations?: VersionMigration<any>[];
  /**
   * If data doesn't have the { version, data } wrapper, treat it as this version.
   * Useful for migrating from unversioned data to versioned.
   */
  legacy?: string;
};
