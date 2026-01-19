import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  andThen,
  type InferOutput,
  type MaybePromise,
  type VersionedData,
  type VersionedSchemaConfig,
  type VersionMigration,
} from "./types";

type ValidationResult<T> =
  | { value: T }
  | { issues: Array<{ message: string }> };

/**
 * Check if value looks like a versioned data wrapper
 */
function isVersionedData(
  value: unknown,
): value is { version: number; data: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    "data" in value &&
    typeof (value as { version: unknown }).version === "number"
  );
}

/**
 * Check if value is a validation error result
 */
function isErrorResult(
  value: unknown,
): value is { issues: Array<{ message: string }> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "issues" in value &&
    Array.isArray((value as { issues: unknown }).issues)
  );
}

/**
 * Run migrations from one version to another.
 * Returns sync if all migrations are sync, async if any is async.
 */
function runMigrations(
  data: unknown,
  fromVersion: number,
  toVersion: number,
  migrationMap: Map<number, VersionMigration>,
): MaybePromise<unknown | { issues: Array<{ message: string }> }> {
  if (fromVersion >= toVersion) {
    return data;
  }

  const migration = migrationMap.get(fromVersion);
  if (!migration) {
    return {
      issues: [{ message: `Missing migration for version: ${fromVersion}` }],
    };
  }

  const result = migration.up(data);
  return andThen(result, (nextData) =>
    runMigrations(nextData, fromVersion + 1, toVersion, migrationMap),
  );
}

/**
 * Create a versioned schema with migration support.
 *
 * The schema validates data in the format `{ version: number, data: T }`.
 * Versions are derived from the migrations array position:
 * - migrations[0] = version 1 (migrates to version 2)
 * - migrations[1] = version 2 (migrates to version 3)
 * - Current version = migrations.length + 1
 *
 * Validation is synchronous when all migrations are synchronous.
 * If any migration returns a Promise, validation returns a Promise.
 *
 * @example
 * ```ts
 * const userSchema = createVersionedSchema({
 *   schema: z.object({
 *     name: z.string(),
 *     age: z.number(),
 *     email: z.string().optional(),
 *   }),
 *   migrations: [
 *     // Version 1 -> 2
 *     {
 *       schema: z.object({ name: z.string() }),
 *       up: (v1) => ({ name: v1.name, age: 0 }),
 *     },
 *     // Version 2 -> 3
 *     {
 *       schema: z.object({ name: z.string(), age: z.number() }),
 *       up: (v2) => ({ ...v2, email: undefined }),
 *     },
 *   ],
 *   allowUnversioned: true, // treat unversioned data as v1
 * })
 *
 * // Input: { version: 1, data: { name: "John" } }
 * // Output: { version: 3, data: { name: "John", age: 0, email: undefined } }
 * ```
 */
export function createVersionedSchema<
  TSchema extends StandardSchemaV1<unknown, unknown>,
>(
  config: VersionedSchemaConfig<TSchema>,
): StandardSchemaV1<unknown, VersionedData<InferOutput<TSchema>>> {
  type Output = InferOutput<TSchema>;
  type Result = ValidationResult<VersionedData<Output>>;

  const { schema, migrations = [], allowUnversioned } = config;

  // Current version is derived from migrations array length + 1
  const currentVersion = migrations.length + 1;

  // Build a map of version number -> migration for quick lookup
  const migrationMap = new Map<number, VersionMigration>();
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    if (migration) {
      migrationMap.set(i + 1, migration); // Version is index + 1
    }
  }

  /**
   * Wrap final validation result
   */
  function wrapFinalResult(
    finalResult: ValidationResult<unknown>,
    currentData: unknown,
  ): Result {
    if ("issues" in finalResult && finalResult.issues?.length) {
      return {
        issues: [
          {
            message: `Migration produced invalid data for current schema: ${finalResult.issues.map((i) => i.message).join(", ")}`,
          },
        ],
      };
    }

    return {
      value: {
        version: currentVersion,
        data: ("value" in finalResult
          ? finalResult.value
          : currentData) as Output,
      },
    };
  }

  return {
    "~standard": {
      version: 1,
      vendor: "jlnstack/schema",
      validate: (value: unknown): MaybePromise<Result> => {
        let inputVersion: number;
        let inputData: unknown;

        // Check if input is already versioned
        if (isVersionedData(value)) {
          inputVersion = value.version;
          inputData = value.data;
        } else if (allowUnversioned) {
          // Treat as unversioned data (version 1)
          inputVersion = 1;
          inputData = value;
        } else {
          return {
            issues: [
              {
                message:
                  "Invalid input: expected { version: number, data: unknown } or set 'allowUnversioned: true' for unversioned data",
              },
            ],
          };
        }

        // Validate version is within range
        if (inputVersion < 1 || inputVersion > currentVersion) {
          return {
            issues: [
              {
                message: `Unknown version: ${inputVersion}. Valid versions are 1 to ${currentVersion}`,
              },
            ],
          };
        }

        // If already at current version, validate directly
        if (inputVersion === currentVersion) {
          return andThen(
            schema["~standard"].validate(inputData),
            (result): Result => {
              if ("value" in result) {
                return {
                  value: {
                    version: currentVersion,
                    data: result.value as Output,
                  },
                };
              }
              return {
                issues: result.issues.map((i) => ({ message: i.message })),
              };
            },
          );
        }

        // Get the starting migration
        const startMigration = migrationMap.get(inputVersion);
        if (!startMigration) {
          return {
            issues: [
              { message: `No migration found for version: ${inputVersion}` },
            ],
          };
        }

        // Validate against the starting version's schema
        return andThen(
          startMigration.schema["~standard"].validate(inputData),
          (initialResult): MaybePromise<Result> => {
            if ("issues" in initialResult && initialResult.issues?.length) {
              return {
                issues: initialResult.issues.map((i) => ({
                  message: i.message,
                })),
              };
            }

            const validatedData =
              "value" in initialResult ? initialResult.value : inputData;

            // Run the migration chain
            return andThen(
              runMigrations(
                validatedData,
                inputVersion,
                currentVersion,
                migrationMap,
              ),
              (migratedData): MaybePromise<Result> => {
                // Check if migration returned an error
                if (isErrorResult(migratedData)) {
                  return migratedData;
                }

                // Validate final result against current schema
                return andThen(
                  schema["~standard"].validate(migratedData),
                  (finalResult) => wrapFinalResult(finalResult, migratedData),
                );
              },
            );
          },
        );
      },
    },
  };
}
