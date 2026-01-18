import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  validateSchema,
  toBase64,
  fromBase64,
  textToBytes,
  bytesToText,
} from "../utils";
import type { Encryptor, EncryptConfig } from "./types";

export type { Encryptor, EncryptConfig } from "./types";

const IV_LENGTH = 12; // 96 bits for AES-GCM

async function deriveKey(secret: string | Uint8Array): Promise<CryptoKey> {
  const keyMaterial =
    typeof secret === "string" ? textToBytes(secret) : secret;

  // If key is exactly 32 bytes (256 bits), use it directly
  if (keyMaterial.length === 32) {
    return crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }

  // Otherwise, derive a key using PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // Use a fixed salt for deterministic key derivation
  // In production, you might want to store the salt with the encrypted data
  const salt = textToBytes("@jlnstack/crypto");

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptAESGCM(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return { iv, ciphertext: new Uint8Array(ciphertext) };
}

async function decryptAESGCM(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}

export function createEncrypt<T = unknown>(
  config: EncryptConfig<T>,
): Encryptor<T> {
  const { schema, key } = config;

  let cryptoKey: CryptoKey | null = null;

  async function getKey(): Promise<CryptoKey> {
    if (!cryptoKey) {
      cryptoKey = await deriveKey(key);
    }
    return cryptoKey;
  }

  return {
    async encrypt(data: T): Promise<string> {
      // Validate data against schema if provided
      if (schema) {
        const result = await validateSchema(schema, data);
        if (!result.success) {
          throw new Error(`Invalid data: ${result.error}`);
        }
      }

      const plaintext = textToBytes(JSON.stringify(data));
      const derivedKey = await getKey();
      const { iv, ciphertext } = await encryptAESGCM(derivedKey, plaintext);

      // Format: base64(iv):base64(ciphertext)
      return `${toBase64(iv)}:${toBase64(ciphertext)}`;
    },

    async decrypt(encrypted: string): Promise<T> {
      const parts = encrypted.split(":");
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
      }

      const [ivBase64, ciphertextBase64] = parts;
      const iv = fromBase64(ivBase64);
      const ciphertext = fromBase64(ciphertextBase64);

      if (iv.length !== IV_LENGTH) {
        throw new Error("Invalid IV length");
      }

      const derivedKey = await getKey();

      let plaintext: Uint8Array;
      try {
        plaintext = await decryptAESGCM(derivedKey, iv, ciphertext);
      } catch {
        throw new Error("Decryption failed: invalid key or corrupted data");
      }

      let data: T;
      try {
        data = JSON.parse(bytesToText(plaintext)) as T;
      } catch {
        throw new Error("Failed to parse decrypted data");
      }

      // Validate data against schema if provided
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
