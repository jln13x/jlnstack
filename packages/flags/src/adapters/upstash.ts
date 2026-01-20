import type { Redis } from "@upstash/redis";
import type { EvaluationContext, FlagsAdapter } from "../types";
import type { UpstashAdapterConfig } from "./types";

export type { UpstashAdapterConfig } from "./types";

/**
 * Create an Upstash Redis adapter for feature flags
 */
export function createUpstashAdapter(
  config: UpstashAdapterConfig,
): FlagsAdapter {
  const { client } = config;

  return {
    async get(
      key: string,
      _context?: EvaluationContext,
    ): Promise<string | undefined> {
      const value = await client.get<string>(key);
      return value ?? undefined;
    },

    async set(
      key: string,
      value: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      await client.set(key, value);
    },

    async delete(
      key: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      await client.del(key);
    },

    async getMany(
      keys: string[],
      _context?: EvaluationContext,
    ): Promise<Map<string, string | undefined>> {
      if (keys.length === 0) {
        return new Map();
      }

      const values = await client.mget<(string | null)[]>(...keys);
      const result = new Map<string, string | undefined>();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];
        if (key !== undefined) {
          result.set(key, value ?? undefined);
        }
      }

      return result;
    },
  };
}
