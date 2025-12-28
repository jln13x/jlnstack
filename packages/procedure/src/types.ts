export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type Awaitable<T> = T | Promise<T>;

export type IsEmptyObject<T> = T extends Record<string, never> ? true : false;
