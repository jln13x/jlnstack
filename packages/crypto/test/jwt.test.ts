import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createJWT } from "../src/jwt";

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

const TEST_SECRET = "super-secret-key-for-testing-purposes";

describe("createJWT", () => {
  describe("sign and verify", () => {
    it("signs and verifies a simple payload", async () => {
      const jwt = createJWT<{ userId: string }>({
        secret: TEST_SECRET,
      });

      const token = await jwt.sign({ userId: "123" });
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const payload = await jwt.verify(token);
      expect(payload.userId).toBe("123");
      expect(payload.iat).toBeDefined();
    });

    it("signs with Uint8Array secret", async () => {
      const secretBytes = new TextEncoder().encode(TEST_SECRET);
      const jwt = createJWT({
        secret: secretBytes,
      });

      const token = await jwt.sign({ data: "test" });
      const payload = await jwt.verify(token);
      expect(payload.data).toBe("test");
    });
  });

  describe("claims", () => {
    it("adds iat claim automatically", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });
      const before = Math.floor(Date.now() / 1000);

      const token = await jwt.sign({ data: "test" });
      const payload = await jwt.verify(token);

      const after = Math.floor(Date.now() / 1000);
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect(payload.iat).toBeLessThanOrEqual(after);
    });

    it("adds exp claim with expiresIn option", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });
      const before = Math.floor(Date.now() / 1000);

      const token = await jwt.sign({ data: "test" }, { expiresIn: 3600 });
      const payload = await jwt.verify(token);

      expect(payload.exp).toBeGreaterThanOrEqual(before + 3600);
    });

    it("adds nbf claim with notBefore option", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });
      const now = Math.floor(Date.now() / 1000);

      const token = await jwt.sign({ data: "test" }, { notBefore: 0 });
      const payload = await jwt.verify(token);

      expect(payload.nbf).toBeGreaterThanOrEqual(now);
    });

    it("adds issuer claim", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { issuer: "test-app" });
      const payload = await jwt.verify(token);

      expect(payload.iss).toBe("test-app");
    });

    it("adds subject claim", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { subject: "user-123" });
      const payload = await jwt.verify(token);

      expect(payload.sub).toBe("user-123");
    });

    it("adds audience claim", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { audience: "my-api" });
      const payload = await jwt.verify(token);

      expect(payload.aud).toBe("my-api");
    });

    it("adds jwtId claim", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { jwtId: "unique-id" });
      const payload = await jwt.verify(token);

      expect(payload.jti).toBe("unique-id");
    });

    it("uses default options", async () => {
      const jwt = createJWT({
        secret: TEST_SECRET,
        defaults: {
          issuer: "default-issuer",
          expiresIn: 3600,
        },
      });

      const token = await jwt.sign({ data: "test" });
      const payload = await jwt.verify(token);

      expect(payload.iss).toBe("default-issuer");
      expect(payload.exp).toBeDefined();
    });

    it("overrides default options with sign options", async () => {
      const jwt = createJWT({
        secret: TEST_SECRET,
        defaults: {
          issuer: "default-issuer",
        },
      });

      const token = await jwt.sign(
        { data: "test" },
        { issuer: "custom-issuer" },
      );
      const payload = await jwt.verify(token);

      expect(payload.iss).toBe("custom-issuer");
    });
  });

  describe("verification", () => {
    it("rejects expired tokens", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { expiresIn: -1 });

      await expect(jwt.verify(token)).rejects.toThrow("Token has expired");
    });

    it("accepts expired tokens within clock tolerance", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { expiresIn: -1 });

      const payload = await jwt.verify(token, { clockTolerance: 10 });
      expect(payload.data).toBe("test");
    });

    it("rejects tokens not yet valid", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { notBefore: 3600 });

      await expect(jwt.verify(token)).rejects.toThrow("Token is not yet valid");
    });

    it("rejects tokens with wrong issuer", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign(
        { data: "test" },
        { issuer: "wrong-issuer" },
      );

      await expect(
        jwt.verify(token, { issuer: "expected-issuer" }),
      ).rejects.toThrow("Invalid issuer");
    });

    it("accepts tokens with matching issuer", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { issuer: "my-app" });

      const payload = await jwt.verify(token, { issuer: "my-app" });
      expect(payload.iss).toBe("my-app");
    });

    it("accepts tokens with issuer in allowed list", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { issuer: "app-2" });

      const payload = await jwt.verify(token, { issuer: ["app-1", "app-2"] });
      expect(payload.iss).toBe("app-2");
    });

    it("rejects tokens with wrong audience", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { audience: "wrong-api" });

      await expect(jwt.verify(token, { audience: "my-api" })).rejects.toThrow(
        "Invalid audience",
      );
    });

    it("accepts tokens with matching audience", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { audience: "my-api" });

      const payload = await jwt.verify(token, { audience: "my-api" });
      expect(payload.aud).toBe("my-api");
    });

    it("rejects tokens with invalid signature", async () => {
      const jwt1 = createJWT({ secret: "secret-1" });
      const jwt2 = createJWT({ secret: "secret-2" });

      const token = await jwt1.sign({ data: "test" });

      await expect(jwt2.verify(token)).rejects.toThrow("Invalid signature");
    });

    it("rejects malformed tokens", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      await expect(jwt.verify("not-a-valid-token")).rejects.toThrow(
        "Invalid token format",
      );
    });
  });

  describe("secret rotation", () => {
    it("verifies tokens signed with current secret", async () => {
      const jwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: ["old-secret-1", "old-secret-2"],
      });

      const token = await jwt.sign({ data: "test" });
      const payload = await jwt.verify(token);

      expect(payload.data).toBe("test");
    });

    it("verifies tokens signed with deprecated secret", async () => {
      const oldJwt = createJWT({ secret: "old-secret" });
      const newJwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: ["old-secret"],
      });

      const token = await oldJwt.sign({ data: "test" });
      const payload = await newJwt.verify(token);

      expect(payload.data).toBe("test");
    });

    it("verifies tokens signed with any deprecated secret", async () => {
      const veryOldJwt = createJWT({ secret: "very-old-secret" });
      const newJwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: ["old-secret", "very-old-secret"],
      });

      const token = await veryOldJwt.sign({ data: "test" });
      const payload = await newJwt.verify(token);

      expect(payload.data).toBe("test");
    });

    it("always signs with current secret", async () => {
      const jwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: ["old-secret"],
      });
      const verifyWithNew = createJWT({ secret: "new-secret" });
      const verifyWithOld = createJWT({ secret: "old-secret" });

      const token = await jwt.sign({ data: "test" });

      // Should verify with new secret
      const payload = await verifyWithNew.verify(token);
      expect(payload.data).toBe("test");

      // Should NOT verify with old secret alone
      await expect(verifyWithOld.verify(token)).rejects.toThrow(
        "Invalid signature",
      );
    });

    it("rejects tokens signed with unknown secret", async () => {
      const unknownJwt = createJWT({ secret: "unknown-secret" });
      const jwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: ["old-secret"],
      });

      const token = await unknownJwt.sign({ data: "test" });

      await expect(jwt.verify(token)).rejects.toThrow("Invalid signature");
    });

    it("supports Uint8Array deprecated secrets", async () => {
      const oldSecret = new TextEncoder().encode("old-secret");
      const oldJwt = createJWT({ secret: oldSecret });
      const newJwt = createJWT({
        secret: "new-secret",
        deprecatedSecrets: [oldSecret],
      });

      const token = await oldJwt.sign({ data: "test" });
      const payload = await newJwt.verify(token);

      expect(payload.data).toBe("test");
    });
  });

  describe("decode", () => {
    it("decodes token without verification", async () => {
      const jwt = createJWT<{ userId: string }>({ secret: TEST_SECRET });

      const token = await jwt.sign({ userId: "123" });
      const { header, payload } = await jwt.decode(token);

      expect(header.alg).toBe("HS256");
      expect(header.typ).toBe("JWT");
      expect(payload.userId).toBe("123");
    });

    it("decodes expired tokens", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      const token = await jwt.sign({ data: "test" }, { expiresIn: -3600 });
      const { payload } = await jwt.decode(token);

      expect(payload.data).toBe("test");
    });

    it("throws on malformed tokens", async () => {
      const jwt = createJWT({ secret: TEST_SECRET });

      await expect(jwt.decode("invalid")).rejects.toThrow(
        "Invalid token format",
      );
    });
  });

  describe("schema validation", () => {
    it("validates payload on sign", async () => {
      const schema = createMockSchema((v) => v as { role: string });
      const jwt = createJWT({
        schema,
        secret: TEST_SECRET,
      });

      const token = await jwt.sign({ role: "admin" });
      expect(typeof token).toBe("string");
    });

    it("rejects invalid payload on sign", async () => {
      const schema = createFailingSchema("Invalid role");
      const jwt = createJWT({
        schema,
        secret: TEST_SECRET,
      });

      await expect(jwt.sign({ role: "invalid" } as never)).rejects.toThrow(
        "Invalid payload",
      );
    });

    it("validates payload on verify", async () => {
      const schema = createMockSchema((v) => v as { role: string });
      const jwt = createJWT({
        schema,
        secret: TEST_SECRET,
      });

      const token = await jwt.sign({ role: "admin" });
      const payload = await jwt.verify(token);

      expect(payload.role).toBe("admin");
    });
  });
});
