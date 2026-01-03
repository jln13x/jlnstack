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

export interface Cookie<T> {
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
  schema?: StandardSchemaV1<T>;
  serializer?: Serializer<T>;
}

export type InferCookieValue<TSchema> = TSchema extends StandardSchemaV1<
  infer T
>
  ? T
  : never;
