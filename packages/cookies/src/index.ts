import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Cookie, CookieConfig, CookieOptions, Serializer } from "./types";

export type {
  Cookie,
  CookieConfig,
  CookieOptions,
  CreateCookieOptions,
  Serializer,
} from "./types";

const jsonSerializer: Serializer<unknown> = {
  serialize: (value) => {
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  },
  deserialize: (raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
};

async function validateSchema<T>(
  schema: StandardSchemaV1<T>,
  value: unknown,
): Promise<{ success: true; value: T } | { success: false }> {
  const result = await schema["~standard"].validate(value);

  if ("issues" in result && result.issues) {
    return { success: false };
  }

  return { success: true, value: result.value as T };
}

export function createCookie<T>(config: CookieConfig<T>): Cookie<T> {
  const {
    name,
    schema,
    serializer = jsonSerializer as Serializer<T>,
    get,
    set,
    delete: deleteFn,
  } = config;

  return {
    name,
    async get() {
      const raw = await get();
      if (raw === undefined) return undefined;

      const parsed = serializer.deserialize(raw);

      if (schema) {
        const result = await validateSchema(schema, parsed);
        if (!result.success) return undefined;
        return result.value;
      }

      return parsed;
    },
    async set(value: T, options?: CookieOptions) {
      if (schema) {
        const result = await validateSchema(schema, value);
        if (!result.success) {
          throw new Error("Invalid cookie value");
        }
      }

      await set(serializer.serialize(value), options);
    },
    async delete() {
      await deleteFn();
    },
  };
}
