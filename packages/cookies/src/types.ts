import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

export interface Serializer<T> {
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
}

export interface Cookie<T = string> {
  name: string;
  get(): Promise<T | undefined>;
  set(value: T, options?: CookieOptions): Promise<void>;
  delete(): Promise<void>;
}

export interface CookieConfig<T> {
  name: string;
  schema?: StandardSchemaV1<T>;
  serializer?: Serializer<T>;
  get: () => Promise<string | undefined> | string | undefined;
  set: (value: string, options?: CookieOptions) => Promise<void> | void;
  delete: () => Promise<void> | void;
}

export interface CreateCookieOptions<T> {
  name: string;
  schema?: StandardSchemaV1<T>;
  serializer?: Serializer<T>;
}

export type InferCookieValue<TSchema> = TSchema extends StandardSchemaV1<
  infer T
>
  ? T
  : never;

export type CookieValues<T extends Record<string, Cookie<unknown>>> = {
  [K in keyof T]: Parameters<T[K]["set"]>[0];
};

export interface _CookieGroup<T extends Record<string, Cookie<unknown>>> {
  get(): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]["get"]>> }>;
  set(values: Partial<CookieValues<T>>, options?: CookieOptions): Promise<void>;
  deleteAll(): Promise<void>;
}

export type CookieGroup<T extends Record<string, Cookie<unknown>>> =
  _CookieGroup<T> & T;
