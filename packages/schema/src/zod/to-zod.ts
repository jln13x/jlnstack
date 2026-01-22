import type { StandardSchemaV1 } from "@standard-schema/spec";
import { z } from "zod";

/**
 * Convert a Standard Schema to a Zod schema.
 *
 * This allows you to chain Zod methods on any Standard Schema.
 *
 * The resulting schema supports both `.parse()` and `.parseAsync()`:
 * - Use `.parse()` when all migrations and validations are synchronous
 * - Use `.parseAsync()` when any migration or validation is asynchronous
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
  return z.unknown().transform((input, ctx) => {
    const result = schema["~standard"].validate(input);

    const handleResult = (
      res: { value: T } | { issues: Array<{ message: string }> },
    ): T => {
      if ("value" in res) {
        return res.value;
      }

      for (const issue of res.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
        });
      }
      return z.NEVER;
    };

    if (result instanceof Promise) {
      return result.then(handleResult);
    }

    return handleResult(result);
  }) as z.ZodType<T, z.ZodTypeDef, unknown>;
}
