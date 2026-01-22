import type { z } from "zod";
import type { VersionedData, VersionMigration } from "../types";
import { createVersionedSchema } from "../versioned";
import { toZod } from "./to-zod";

/**
 * Configuration for createVersionedZodSchema.
 */
export type VersionedZodSchemaConfig<TSchema extends z.ZodType> = {
  /**
   * The current Zod schema (source of truth)
   */
  schema: TSchema;
  /**
   * Migrations from older versions, ordered from oldest to newest.
   * - migrations[0] handles version 1 data and upgrades to version 2
   * - migrations[1] handles version 2 data and upgrades to version 3
   * - etc.
   */
  migrations?: Array<{
    schema: z.ZodType;
    up: (data: unknown) => unknown | Promise<unknown>;
  }>;
  /**
   * If true, accept data without the { version, data } wrapper
   * and treat it as version 1.
   */
  allowUnversioned?: boolean;
};

/**
 * Create a versioned Zod schema with migration support.
 *
 * This is a convenience wrapper that combines `createVersionedSchema` with `toZod`,
 * returning a Zod schema directly so you can chain Zod methods.
 *
 * @example
 * ```ts
 * import { createVersionedZodSchema } from "@jlnstack/schema/zod"
 * import { z } from "zod"
 *
 * const userSchema = createVersionedZodSchema({
 *   schema: z.object({ name: z.string(), age: z.number() }),
 *   migrations: [
 *     {
 *       schema: z.object({ name: z.string() }),
 *       up: (v1) => ({ name: v1.name, age: 0 }),
 *     },
 *   ],
 *   allowUnversioned: true,
 * })
 *
 * // Chain Zod methods
 * const adultUser = userSchema
 *   .refine((v) => v.data.age >= 18, "Must be 18+")
 *   .transform((v) => v.data)
 *
 * await adultUser.parseAsync({ name: "John" })
 * ```
 */
export function createVersionedZodSchema<TSchema extends z.ZodType>(
  config: VersionedZodSchemaConfig<TSchema>,
): z.ZodType<VersionedData<z.infer<TSchema>>, z.ZodTypeDef, unknown> {
  const { schema, migrations = [], allowUnversioned } = config;

  const standardMigrations: VersionMigration<unknown>[] = migrations.map(
    (m) => ({
      schema: m.schema,
      up: m.up,
    }),
  );

  const versionedSchema = createVersionedSchema({
    schema,
    migrations: standardMigrations,
    allowUnversioned,
  });

  return toZod(versionedSchema);
}
