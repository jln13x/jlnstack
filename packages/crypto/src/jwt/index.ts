import type { StandardSchemaV1 } from "@standard-schema/spec";
import { parseJWT } from "@oslojs/jwt";
import { hmac } from "@oslojs/crypto/hmac";
import { SHA256, SHA384, SHA512 } from "@oslojs/crypto/sha2";
import { constantTimeEqual } from "@oslojs/crypto/subtle";
import { validateSchema, textToBytes, toBase64Url } from "../utils";
import type {
  JWT,
  JWTConfig,
  JWTHeader,
  JWTClaims,
  JWTAlgorithm,
  SignOptions,
  VerifyOptions,
} from "./types";

export type {
  JWT,
  JWTConfig,
  JWTHeader,
  JWTClaims,
  JWTAlgorithm,
  SignOptions,
  VerifyOptions,
} from "./types";

const HASH_ALGORITHMS = {
  HS256: SHA256,
  HS384: SHA384,
  HS512: SHA512,
} as const;

function getSecretBytes(secret: string | Uint8Array): Uint8Array {
  return typeof secret === "string" ? textToBytes(secret) : secret;
}

function sign(
  algorithm: JWTAlgorithm,
  secret: Uint8Array,
  data: string,
): Uint8Array {
  const hashAlgorithm = HASH_ALGORITHMS[algorithm];
  return hmac(hashAlgorithm, secret, textToBytes(data));
}

function verifySignature(
  algorithm: JWTAlgorithm,
  secret: Uint8Array,
  data: string,
  signature: Uint8Array,
): boolean {
  const expected = sign(algorithm, secret, data);
  return constantTimeEqual(expected, signature);
}

export function createJWT<T = Record<string, unknown>>(
  config: JWTConfig<T>,
): JWT<T> {
  const {
    payload: payloadSchema,
    secret,
    algorithm = "HS256",
    defaults = {},
  } = config;

  const secretBytes = getSecretBytes(secret);

  return {
    async sign(payload: T, options: SignOptions = {}): Promise<string> {
      // Validate payload against schema if provided
      if (payloadSchema) {
        const result = await validateSchema(payloadSchema, payload);
        if (!result.success) {
          throw new Error(`Invalid payload: ${result.error}`);
        }
      }

      const mergedOptions = { ...defaults, ...options };
      const now = Math.floor(Date.now() / 1000);

      // Build claims
      const claims: JWTClaims = {
        ...payload,
        iat: now,
      };

      if (mergedOptions.expiresIn !== undefined) {
        claims.exp = now + mergedOptions.expiresIn;
      }

      if (mergedOptions.notBefore !== undefined) {
        claims.nbf = now + mergedOptions.notBefore;
      }

      if (mergedOptions.issuer !== undefined) {
        claims.iss = mergedOptions.issuer;
      }

      if (mergedOptions.subject !== undefined) {
        claims.sub = mergedOptions.subject;
      }

      if (mergedOptions.audience !== undefined) {
        claims.aud = mergedOptions.audience;
      }

      if (mergedOptions.jwtId !== undefined) {
        claims.jti = mergedOptions.jwtId;
      }

      // Build header
      const header: JWTHeader = {
        alg: algorithm,
        typ: "JWT",
      };

      // Create signature
      const headerEncoded = toBase64Url(textToBytes(JSON.stringify(header)));
      const payloadEncoded = toBase64Url(textToBytes(JSON.stringify(claims)));
      const signatureInput = `${headerEncoded}.${payloadEncoded}`;
      const signature = sign(algorithm, secretBytes, signatureInput);
      const signatureEncoded = toBase64Url(signature);

      return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
    },

    async verify(
      token: string,
      options: VerifyOptions = {},
    ): Promise<T & JWTClaims> {
      let header: object;
      let payload: object;
      let signature: Uint8Array;

      try {
        [header, payload, signature] = parseJWT(token);
      } catch {
        throw new Error("Invalid token format");
      }

      const jwtHeader = header as JWTHeader;
      const claims = payload as T & JWTClaims;

      // Verify algorithm
      if (jwtHeader.alg !== algorithm) {
        throw new Error(
          `Algorithm mismatch: expected ${algorithm}, got ${jwtHeader.alg}`,
        );
      }

      // Verify signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const signatureInput = `${parts[0]}.${parts[1]}`;
      if (!verifySignature(algorithm, secretBytes, signatureInput, signature)) {
        throw new Error("Invalid signature");
      }

      const now = Math.floor(Date.now() / 1000);
      const clockTolerance = options.clockTolerance ?? 0;

      // Verify expiration
      if (claims.exp !== undefined && now > claims.exp + clockTolerance) {
        throw new Error("Token has expired");
      }

      // Verify not before
      if (claims.nbf !== undefined && now < claims.nbf - clockTolerance) {
        throw new Error("Token is not yet valid");
      }

      // Verify issuer
      if (options.issuer !== undefined) {
        const validIssuers = Array.isArray(options.issuer)
          ? options.issuer
          : [options.issuer];
        if (!claims.iss || !validIssuers.includes(claims.iss)) {
          throw new Error("Invalid issuer");
        }
      }

      // Verify audience
      if (options.audience !== undefined) {
        const validAudiences = Array.isArray(options.audience)
          ? options.audience
          : [options.audience];
        const tokenAudiences = Array.isArray(claims.aud)
          ? claims.aud
          : claims.aud
            ? [claims.aud]
            : [];
        const hasValidAudience = tokenAudiences.some((aud) =>
          validAudiences.includes(aud),
        );
        if (!hasValidAudience) {
          throw new Error("Invalid audience");
        }
      }

      // Validate payload against schema if provided
      if (payloadSchema) {
        const result = await validateSchema(payloadSchema, claims);
        if (!result.success) {
          throw new Error(`Invalid payload: ${result.error}`);
        }
      }

      return claims;
    },

    decode(token: string): { header: JWTHeader; payload: T & JWTClaims } {
      let header: object;
      let payload: object;

      try {
        [header, payload] = parseJWT(token);
      } catch {
        throw new Error("Invalid token format");
      }

      return {
        header: header as JWTHeader,
        payload: payload as T & JWTClaims,
      };
    },
  };
}
