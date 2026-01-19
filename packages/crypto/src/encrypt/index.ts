import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface EncryptConfig<T> {
  schema?: StandardSchemaV1<T>;
  key: string | Uint8Array;
}

export interface Encryptor<T> {
  encrypt(data: T): Promise<string>;
  decrypt(encrypted: string): Promise<T>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const fromBase64 = (str: string) =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function validateSchema<T>(schema: StandardSchemaV1<T>, value: unknown) {
  const result = await schema["~standard"].validate(value);
  if ("issues" in result && result.issues) {
    return {
      success: false as const,
      error: result.issues[0]?.message ?? "Validation failed",
    };
  }
  return { success: true as const, value: result.value as T };
}

async function deriveKey(secret: string | Uint8Array) {
  const keyMaterial =
    typeof secret === "string" ? encoder.encode(secret) : secret;
  const hash = await crypto.subtle.digest("SHA-256", keyMaterial);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export function createEncrypt<T = unknown>(
  config: EncryptConfig<T>,
): Encryptor<T> {
  const { schema, key } = config;
  let cryptoKey: CryptoKey | null = null;

  async function getKey() {
    if (!cryptoKey) {
      cryptoKey = await deriveKey(key);
    }
    return cryptoKey;
  }

  return {
    async encrypt(data: T) {
      if (schema) {
        const result = await validateSchema(schema, data);
        if (!result.success) {
          throw new Error(`Invalid data: ${result.error}`);
        }
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = encoder.encode(JSON.stringify(data));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await getKey(),
        plaintext,
      );

      return `${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
    },

    async decrypt(encrypted: string) {
      const [ivB64, ctB64] = encrypted.split(":");
      if (!ivB64 || !ctB64) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = fromBase64(ivB64);
      const ciphertext = fromBase64(ctB64);

      let plaintext: ArrayBuffer;
      try {
        plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          await getKey(),
          ciphertext,
        );
      } catch {
        throw new Error("Decryption failed");
      }

      let data: T;
      try {
        data = JSON.parse(decoder.decode(plaintext)) as T;
      } catch {
        throw new Error("Failed to parse decrypted data");
      }

      if (schema) {
        const result = await validateSchema(schema, data);
        if (!result.success) {
          throw new Error(`Invalid data: ${result.error}`);
        }
        return result.value;
      }

      return data;
    },
  };
}
