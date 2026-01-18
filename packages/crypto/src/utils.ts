import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  encodeBase64,
  decodeBase64,
  encodeBase64url,
  decodeBase64url,
} from "@oslojs/encoding";

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export async function validateSchema<T>(
  schema: StandardSchemaV1<T>,
  value: unknown,
): Promise<ValidationResult<T>> {
  const result = await schema["~standard"].validate(value);

  if ("issues" in result && result.issues) {
    const message = result.issues[0]?.message ?? "Validation failed";
    return { success: false, error: message };
  }

  return { success: true, value: result.value as T };
}

export function toBase64(data: Uint8Array): string {
  return encodeBase64(data);
}

export function fromBase64(str: string): Uint8Array {
  return decodeBase64(str);
}

export function toBase64Url(data: Uint8Array): string {
  return encodeBase64url(data);
}

export function fromBase64Url(str: string): Uint8Array {
  return decodeBase64url(str);
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
