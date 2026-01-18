import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  InferOutput,
  VersionedData,
  VersionedSchemaConfig,
  VersionMigration,
} from "./types";

/**
 * Check if value looks like a versioned data wrapper
 */
function isVersionedData(value: unknown): value is { version: string; data: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    "data" in value &&
    typeof (value as { version: unknown }).version === "string"
  );
}

/**
 * Create a versioned schema with migration support.
 *
 * The schema validates data in the format `{ version: string, data: T }`.
 * If migrations are provided, older versions are automatically migrated
 * to the current version.
 *
 * @example
 * ```ts
 * const userSchema = createVersionedSchema({
 *   version: "3",
 *   schema: z.object({
 *     name: z.string(),
 *     age: z.number(),
 *     email: z.string().optional(),
 *   }),
 *   migrations: [
 *     {
 *       version: "1",
 *       schema: z.object({ name: z.string() }),
 *       up: (v1) => ({ name: v1.name, age: 0 }),
 *     },
 *     {
 *       version: "2",
 *       schema: z.object({ name: z.string(), age: z.number() }),
 *       up: (v2) => ({ ...v2, email: undefined }),
 *     },
 *   ],
 *   legacy: "1", // treat unversioned data as v1
 * })
 *
 * // Input: { version: "1", data: { name: "John" } }
 * // Output: { version: "3", data: { name: "John", age: 0, email: undefined } }
 * ```
 */
export function createVersionedSchema<
  TSchema extends StandardSchemaV1<unknown, unknown>,
>(
  config: VersionedSchemaConfig<TSchema>,
): StandardSchemaV1<unknown, VersionedData<InferOutput<TSchema>>> {
  type Output = InferOutput<TSchema>;

  const { version: currentVersion, schema, migrations = [], legacy } = config;

  // Build a map of version -> migration for quick lookup
  const migrationMap = new Map<string, VersionMigration>();
  for (const migration of migrations) {
    migrationMap.set(migration.version, migration);
  }

  // Build ordered list of versions for migration chain
  const versionOrder = [...migrations.map((m) => m.version), currentVersion];

  return {
    "~standard": {
      version: 1,
      vendor: "jlnstack/schema",
      validate: async (
        value: unknown,
      ): Promise<
        | { value: VersionedData<Output> }
        | { issues: Array<{ message: string }> }
      > => {
        let inputVersion: string;
        let inputData: unknown;

        // Check if input is already versioned
        if (isVersionedData(value)) {
          inputVersion = value.version;
          inputData = value.data;
        } else if (legacy !== undefined) {
          // Treat as legacy (unversioned) data
          inputVersion = legacy;
          inputData = value;
        } else {
          return {
            issues: [
              {
                message:
                  "Invalid input: expected { version: string, data: unknown } or configure 'legacy' option for unversioned data",
              },
            ],
          };
        }

        // If already at current version, validate directly
        if (inputVersion === currentVersion) {
          const result = await schema["~standard"].validate(inputData);
          if ("value" in result) {
            return { value: { version: currentVersion, data: result.value as Output } };
          }
          return {
            issues: result.issues.map((i) => ({ message: i.message })),
          };
        }

        // Find the starting version in our migration chain
        const startIndex = versionOrder.indexOf(inputVersion);
        if (startIndex === -1) {
          return {
            issues: [{ message: `Unknown version: ${inputVersion}` }],
          };
        }

        // Validate against the starting version's schema
        const startMigration = migrationMap.get(inputVersion);
        if (!startMigration) {
          return {
            issues: [{ message: `No migration found for version: ${inputVersion}` }],
          };
        }

        const initialResult =
          await startMigration.schema["~standard"].validate(inputData);
        if ("issues" in initialResult && initialResult.issues?.length) {
          return {
            issues: initialResult.issues.map((i) => ({ message: i.message })),
          };
        }

        // Walk up the migration chain
        let currentData: unknown = "value" in initialResult ? initialResult.value : inputData;

        for (let i = startIndex; i < versionOrder.length - 1; i++) {
          const migrationVersion = versionOrder[i];
          if (!migrationVersion) {
            return {
              issues: [{ message: "Invalid migration chain" }],
            };
          }
          const migration = migrationMap.get(migrationVersion);

          if (!migration) {
            return {
              issues: [{ message: `Missing migration for version: ${migrationVersion}` }],
            };
          }

          // Run the up migration
          currentData = await migration.up(currentData);
        }

        // Validate final result against current schema
        const finalResult = await schema["~standard"].validate(currentData);
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
            data: ("value" in finalResult ? finalResult.value : currentData) as Output,
          },
        };
      },
    },
  };
}
