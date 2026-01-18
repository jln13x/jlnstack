import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { InferOutput, Migration } from "./types";

/**
 * Create a schema that can migrate from older formats.
 *
 * The current schema is the source of truth. When validation fails,
 * the migrations are tried in order until one matches, then the
 * migrate function transforms the data to the current format.
 *
 * @example
 * ```ts
 * const userSchema = createMigratableSchema(
 *   z.object({ name: z.string(), age: z.number(), email: z.string().optional() }),
 *   [
 *     {
 *       from: z.object({ name: z.string() }),
 *       migrate: (old) => ({ name: old.name, age: 0, email: undefined }),
 *     },
 *     {
 *       from: z.object({ name: z.string(), age: z.number() }),
 *       migrate: (old) => ({ ...old, email: undefined }),
 *     },
 *   ]
 * )
 * ```
 */
export function createMigratableSchema<
  TSchema extends StandardSchemaV1<unknown, unknown>,
>(
  schema: TSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrations: Migration<any, InferOutput<TSchema>>[],
): StandardSchemaV1<unknown, InferOutput<TSchema>> {
  type Output = InferOutput<TSchema>;

  return {
    "~standard": {
      version: 1,
      vendor: "jlnstack/schema",
      validate: async (value: unknown) => {
        // Try current schema first
        const result = await schema["~standard"].validate(value);

        if (!("issues" in result) || !result.issues?.length) {
          return result as { value: Output };
        }

        // Try migrations in order
        for (const migration of migrations) {
          const migrationResult =
            await migration.from["~standard"].validate(value);

          if ("value" in migrationResult) {
            // Found a match - migrate it
            const migrated = await migration.migrate(migrationResult.value);
            return { value: migrated as Output };
          }
        }

        // No migration matched - return original error
        return result;
      },
    },
  };
}
