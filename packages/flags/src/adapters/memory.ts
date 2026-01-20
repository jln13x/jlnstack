import type { FlagAdapter } from "../types";

export interface MemoryAdapterConfig {
  flags?: Record<string, boolean>;
  namespace?: string;
}

const globalKey = Symbol.for("@jlnstack/flags/memory");

function getGlobalStore(): Map<string, Map<string, boolean>> {
  const g = globalThis as typeof globalThis & {
    [globalKey]?: Map<string, Map<string, boolean>>;
  };
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey];
}

export function memoryAdapter(config: MemoryAdapterConfig = {}): FlagAdapter {
  const namespace = config.namespace ?? "default";
  const globalStore = getGlobalStore();

  if (!globalStore.has(namespace)) {
    globalStore.set(
      namespace,
      new Map<string, boolean>(Object.entries(config.flags ?? {})),
    );
  }

  const store = globalStore.get(namespace)!;

  return {
    get(key, _context) {
      const value = store.get(key);
      return value ?? null;
    },
    set(key, value) {
      store.set(key, value);
    },
  };
}
