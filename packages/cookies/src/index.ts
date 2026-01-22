import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  Cookie,
  CookieConfig,
  CookieGroup,
  CookieGroupOptions,
  CookieOptions,
  Serializer,
} from "./types";

export type {
  Cookie,
  CookieGroup,
  CookieGroupOptions,
  CookieOptions,
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

export function createCookie<T = string>(config: CookieConfig<T>): Cookie<T> {
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

export function createCookieGroup<T extends Record<string, Cookie<unknown>>>(
  cookies: T,
  options?: CookieGroupOptions,
): CookieGroup<T> {
  const prefix = options?.prefix ?? "";
  const defaults = options?.defaults;

  const prefixedCookies = Object.fromEntries(
    Object.entries(cookies).map(([key, cookie]) => [
      key,
      {
        ...cookie,
        name: prefix + cookie.name,
        set: (value: unknown, opts?: CookieOptions) =>
          cookie.set(value, { ...defaults, ...opts }),
      },
    ]),
  ) as T;

  return {
    ...prefixedCookies,
    async get() {
      const entries = await Promise.all(
        Object.entries(prefixedCookies).map(async ([key, cookie]) => [
          key,
          await cookie.get(),
        ]),
      );
      return Object.fromEntries(entries) as {
        [K in keyof T]: Awaited<ReturnType<T[K]["get"]>>;
      };
    },
    async set(
      values: Partial<{ [K in keyof T]: Parameters<T[K]["set"]>[0] }>,
      opts?: CookieOptions,
    ) {
      const promises: Promise<void>[] = [];
      for (const [key, value] of Object.entries(values)) {
        const cookie = prefixedCookies[key as keyof T];
        if (cookie && value !== undefined) {
          promises.push(cookie.set(value, opts));
        }
      }
      await Promise.all(promises);
    },
    async deleteAll() {
      await Promise.all(Object.values(prefixedCookies).map((c) => c.delete()));
    },
  };
}
