import type { StandardSchemaV1 } from "@standard-schema/spec";

export type JWTAlgorithm = "HS256" | "HS384" | "HS512";

export interface JWTHeader {
  alg: JWTAlgorithm;
  typ: "JWT";
}

export interface JWTClaims {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface SignOptions {
  expiresIn?: number;
  notBefore?: number;
  issuer?: string;
  subject?: string;
  audience?: string | string[];
  jwtId?: string;
}

export interface VerifyOptions {
  clockTolerance?: number;
  issuer?: string | string[];
  audience?: string | string[];
}

export interface JWTConfig<T> {
  payload?: StandardSchemaV1<T>;
  secret: string | Uint8Array;
  algorithm?: JWTAlgorithm;
  defaults?: SignOptions;
}

export interface JWT<T> {
  sign(payload: T, options?: SignOptions): Promise<string>;
  verify(token: string, options?: VerifyOptions): Promise<T & JWTClaims>;
  decode(token: string): { header: JWTHeader; payload: T & JWTClaims };
}
