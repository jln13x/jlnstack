import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface EncryptConfig<T> {
  schema?: StandardSchemaV1<T>;
  key: string | Uint8Array;
}

export interface Encryptor<T> {
  encrypt(data: T): Promise<string>;
  decrypt(encrypted: string): Promise<T>;
}
