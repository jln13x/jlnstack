import type { EvaluationContext, FlagsAdapter } from "../types";
import type { MemoryAdapterConfig } from "./types";

export type { MemoryAdapterConfig } from "./types";

/**
 * Create an in-memory adapter for feature flags (useful for testing)
 */
export function createMemoryAdapter(
  config: MemoryAdapterConfig = {},
): FlagsAdapter {
  const store = new Map<string, string>(
    Object.entries(config.initialValues ?? {}),
  );

  return {
    async get(
      key: string,
      _context?: EvaluationContext,
    ): Promise<string | undefined> {
      return store.get(key);
    },

    async set(
      key: string,
      value: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      store.set(key, value);
    },

    async delete(
      key: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      store.delete(key);
    },

    async getMany(
      keys: string[],
      _context?: EvaluationContext,
    ): Promise<Map<string, string | undefined>> {
      const result = new Map<string, string | undefined>();
      for (const key of keys) {
        result.set(key, store.get(key));
      }
      return result;
    },
  };
}
