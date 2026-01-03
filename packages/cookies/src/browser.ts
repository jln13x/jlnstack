import { createCookie as createCookieCore } from "./index";
import type { Cookie, CookieOptions, CreateCookieOptions } from "./types";

export { createCookieGroup } from "./index";
export type { Cookie, CookieGroup, CookieOptions, Serializer } from "./types";

function getCookie(name: string): string | undefined {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return undefined;
}

function setCookie(name: string, value: string, options?: CookieOptions): void {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options?.maxAge !== undefined) {
    parts.push(`max-age=${options.maxAge}`);
  }
  if (options?.expires) {
    parts.push(`expires=${options.expires.toUTCString()}`);
  }
  if (options?.path) {
    parts.push(`path=${options.path}`);
  }
  if (options?.domain) {
    parts.push(`domain=${options.domain}`);
  }
  if (options?.secure) {
    parts.push("secure");
  }
  if (options?.sameSite) {
    parts.push(`samesite=${options.sameSite}`);
  }

  document.cookie = parts.join("; ");
}

function deleteCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=; max-age=0`;
}

export function createCookie<T>(
  name: string,
  options?: CreateCookieOptions<T>,
): Cookie<T> {
  return createCookieCore({
    name,
    schema: options?.schema,
    serializer: options?.serializer,
    get: () => getCookie(name),
    set: (value, opts) => setCookie(name, value, opts),
    delete: () => deleteCookie(name),
  });
}
