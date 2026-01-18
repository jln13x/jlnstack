import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createEncrypt } from "../src/encrypt";

function createMockSchema<T>(
  transform: (value: unknown) => T,
): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: transform(value) as T }),
    },
  };
}

function createFailingSchema(message: string): StandardSchemaV1<never> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ issues: [{ message }] }),
    },
  };
}

const TEST_KEY = "super-secret-encryption-key-32b!"; // 32 bytes

describe("createEncrypt", () => {
  describe("encrypt and decrypt", () => {
    it("encrypts and decrypts a simple object", async () => {
      const encryptor = createEncrypt<{ name: string }>({
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ name: "John" });
      expect(typeof encrypted).toBe("string");
      expect(encrypted).toContain(":");

      const decrypted = await encryptor.decrypt(encrypted);
      expect(decrypted).toEqual({ name: "John" });
    });

    it("encrypts and decrypts complex objects", async () => {
      const encryptor = createEncrypt<{
        user: { id: number; roles: string[] };
        metadata: { createdAt: string };
      }>({
        key: TEST_KEY,
      });

      const data = {
        user: { id: 123, roles: ["admin", "user"] },
        metadata: { createdAt: "2024-01-01" },
      };

      const encrypted = await encryptor.encrypt(data);
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual(data);
    });

    it("encrypts and decrypts arrays", async () => {
      const encryptor = createEncrypt<string[]>({
        key: TEST_KEY,
      });

      const data = ["one", "two", "three"];

      const encrypted = await encryptor.encrypt(data);
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual(data);
    });

    it("encrypts and decrypts primitive values", async () => {
      const encryptor = createEncrypt<string>({
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt("secret message");
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toBe("secret message");
    });

    it("produces different ciphertext for same plaintext", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: TEST_KEY,
      });

      const data = { data: "same" };

      const encrypted1 = await encryptor.encrypt(data);
      const encrypted2 = await encryptor.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("works with Uint8Array key", async () => {
      const keyBytes = new TextEncoder().encode(TEST_KEY);
      const encryptor = createEncrypt<{ data: string }>({
        key: keyBytes,
      });

      const encrypted = await encryptor.encrypt({ data: "test" });
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual({ data: "test" });
    });

    it("derives key from short password", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: "short-key",
      });

      const encrypted = await encryptor.encrypt({ data: "test" });
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual({ data: "test" });
    });
  });

  describe("error handling", () => {
    it("throws on invalid encrypted format", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: TEST_KEY,
      });

      await expect(encryptor.decrypt("invalid")).rejects.toThrow(
        "Invalid encrypted data format",
      );
    });

    it("throws on corrupted ciphertext", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ data: "test" });
      const [iv] = encrypted.split(":");
      const corrupted = `${iv}:corrupted-data`;

      await expect(encryptor.decrypt(corrupted)).rejects.toThrow();
    });

    it("throws on wrong key", async () => {
      const encryptor1 = createEncrypt<{ data: string }>({
        key: "key-one-that-is-32-bytes-long!!!",
      });
      const encryptor2 = createEncrypt<{ data: string }>({
        key: "key-two-that-is-32-bytes-long!!!",
      });

      const encrypted = await encryptor1.encrypt({ data: "secret" });

      await expect(encryptor2.decrypt(encrypted)).rejects.toThrow(
        "Decryption failed",
      );
    });

    it("throws on invalid IV length", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ data: "test" });
      const [, ct] = encrypted.split(":");
      const invalidIv = btoa("short");
      const corrupted = `${invalidIv}:${ct}`;

      await expect(encryptor.decrypt(corrupted)).rejects.toThrow(
        "Invalid IV length",
      );
    });
  });

  describe("schema validation", () => {
    it("validates data on encrypt", async () => {
      const schema = createMockSchema((v) => v as { ssn: string });
      const encryptor = createEncrypt({
        schema,
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ ssn: "123-45-6789" });
      expect(typeof encrypted).toBe("string");
    });

    it("rejects invalid data on encrypt", async () => {
      const schema = createFailingSchema("Invalid SSN");
      const encryptor = createEncrypt({
        schema,
        key: TEST_KEY,
      });

      await expect(encryptor.encrypt({ ssn: "invalid" } as never)).rejects.toThrow(
        "Invalid data",
      );
    });

    it("validates data on decrypt", async () => {
      const schema = createMockSchema((v) => v as { ssn: string });
      const encryptor = createEncrypt({
        schema,
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ ssn: "123-45-6789" });
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual({ ssn: "123-45-6789" });
    });

    it("returns schema-validated value", async () => {
      const schema = createMockSchema((v) => ({
        ...(v as { ssn: string }),
        validated: true,
      }));
      const encryptor = createEncrypt({
        schema,
        key: TEST_KEY,
      });

      const encrypted = await encryptor.encrypt({ ssn: "123" } as any);
      const decrypted = await encryptor.decrypt(encrypted);

      expect(decrypted).toEqual({ ssn: "123", validated: true });
    });
  });

  describe("key caching", () => {
    it("reuses derived key for multiple operations", async () => {
      const encryptor = createEncrypt<{ data: string }>({
        key: TEST_KEY,
      });

      // Multiple encryptions should work with same derived key
      const encrypted1 = await encryptor.encrypt({ data: "one" });
      const encrypted2 = await encryptor.encrypt({ data: "two" });
      const encrypted3 = await encryptor.encrypt({ data: "three" });

      expect(await encryptor.decrypt(encrypted1)).toEqual({ data: "one" });
      expect(await encryptor.decrypt(encrypted2)).toEqual({ data: "two" });
      expect(await encryptor.decrypt(encrypted3)).toEqual({ data: "three" });
    });
  });
});
