import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as jose from "jose";

export type { JWTHeaderParameters, JWTPayload } from "jose";

export interface JWTConfig<T> {
  schema?: StandardSchemaV1<T>;
  secret: string | Uint8Array;
  defaults?: {
    expiresIn?: number;
    notBefore?: number;
    issuer?: string;
    subject?: string;
    audience?: string | string[];
    jwtId?: string;
  };
}

async function validate<T>(schema: StandardSchemaV1<T>, value: unknown) {
  const result = await schema["~standard"].validate(value);
  if ("issues" in result && result.issues) {
    throw new Error(
      `Invalid payload: ${result.issues[0]?.message ?? "Validation failed"}`,
    );
  }
  return result.value as T;
}

export function createJWT<T extends jose.JWTPayload = jose.JWTPayload>(
  config: JWTConfig<T>,
) {
  const { schema, secret, defaults = {} } = config;
  const secretBytes =
    typeof secret === "string" ? new TextEncoder().encode(secret) : secret;

  return {
    async sign(payload: T, options?: JWTConfig<T>["defaults"]) {
      if (schema) await validate(schema, payload);

      const opts = { ...defaults, ...options };

      let jwt = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt();

      if (opts.expiresIn !== undefined)
        jwt = jwt.setExpirationTime(`${opts.expiresIn}s`);
      if (opts.notBefore !== undefined)
        jwt = jwt.setNotBefore(`${opts.notBefore}s`);
      if (opts.issuer !== undefined) jwt = jwt.setIssuer(opts.issuer);
      if (opts.subject !== undefined) jwt = jwt.setSubject(opts.subject);
      if (opts.audience !== undefined) jwt = jwt.setAudience(opts.audience);
      if (opts.jwtId !== undefined) jwt = jwt.setJti(opts.jwtId);

      return jwt.sign(secretBytes);
    },

    async verify(
      token: string,
      options?: {
        clockTolerance?: number;
        issuer?: string | string[];
        audience?: string | string[];
      },
    ) {
      try {
        const { payload } = await jose.jwtVerify(token, secretBytes, {
          algorithms: ["HS256"],
          ...options,
        });

        if (schema) {
          const validated = await validate(schema, payload);
          return { ...validated, ...payload } as T;
        }

        return payload as T;
      } catch (error) {
        if (error instanceof jose.errors.JWTExpired) {
          throw new Error("Token has expired");
        }
        if (error instanceof jose.errors.JWTClaimValidationFailed) {
          const msg = error.message;
          if (msg.includes("iss")) throw new Error("Invalid issuer");
          if (msg.includes("aud")) throw new Error("Invalid audience");
          if (msg.includes("nbf")) throw new Error("Token is not yet valid");
          throw new Error(msg);
        }
        if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
          throw new Error("Invalid signature");
        }
        if (
          error instanceof Error &&
          error.message.startsWith("Invalid payload:")
        ) {
          throw error;
        }
        throw new Error("Invalid token format");
      }
    },

    async decode(token: string) {
      let header: jose.ProtectedHeaderParameters;
      let payload: jose.JWTPayload;

      try {
        header = jose.decodeProtectedHeader(token);
        payload = jose.decodeJwt(token);
      } catch {
        throw new Error("Invalid token format");
      }

      if (schema) {
        const validated = await validate(schema, payload);
        return { header, payload: { ...validated, ...payload } as T };
      }

      return { header, payload: payload as T };
    },
  };
}
