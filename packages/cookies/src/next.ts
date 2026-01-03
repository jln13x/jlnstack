import { cookies } from "next/headers";
import { createCookie as createCookieCore } from "./index";
import type { Cookie, CreateCookieOptions } from "./types";

export { createCookieGroup } from "./index";
export type { Cookie, CookieGroup, CookieOptions, Serializer } from "./types";

export function createCookie<T>(
  name: string,
  options?: CreateCookieOptions<T>,
): Cookie<T> {
  return createCookieCore({
    name,
    schema: options?.schema,
    serializer: options?.serializer,
    get: async () => (await cookies()).get(name)?.value,
    set: async (value, opts) => {
      (await cookies()).set(name, value, opts);
    },
    delete: async () => {
      (await cookies()).delete(name);
    },
  });
}
