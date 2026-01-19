import type { StandardSchemaV1 } from "@standard-schema/spec";
import { z } from "zod";

/**
 * Convert a Standard Schema to a Zod schema.
 *
 * This allows you to chain Zod methods on any Standard Schema.
 *
 * @example
 * ```ts
 * import { toZod } from "@jlnstack/schema/zod"
 * import * as v from "valibot"
 *
 * const valibotSchema = v.object({ name: v.string() })
 *
 * const zodSchema = toZod(valibotSchema)
 *   .refine((u) => u.name.length > 0, "Name required")
 *   .transform((u) => u.name.toUpperCase())
 * ```
 */
export function toZod<T>(
  schema: StandardSchemaV1<unknown, T>,
): z.ZodType<T, z.ZodTypeDef, unknown> {
  return z.unknown().transform(async (input, ctx) => {
    const result = await schema["~standard"].validate(input);

    if ("value" in result) {
      return result.value;
    }

    for (const issue of result.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
      });
    }
    return z.NEVER;
  }) as z.ZodType<T, z.ZodTypeDef, unknown>;
}
