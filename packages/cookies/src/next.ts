import { cookies } from "next/headers";
import { createCookie as createCookieCore } from "./index";
import type { Cookie, CreateCookieOptions } from "./types";

export { createCookieGroup } from "./index";
export type { Cookie, CookieGroup, CookieOptions, Serializer } from "./types";

export function createCookie<T = string>(
  options: CreateCookieOptions<T>,
): Cookie<T> {
  return createCookieCore({
    name: options.name,
    schema: options.schema,
    serializer: options.serializer,
    get: async () => (await cookies()).get(options.name)?.value,
    set: async (value, opts) => {
      (await cookies()).set(options.name, value, opts);
    },
    delete: async () => {
      (await cookies()).delete(options.name);
    },
  });
}
