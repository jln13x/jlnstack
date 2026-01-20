import type { AuditAdapter, AuditEntry } from "../types";

export type MemoryAdapter = AuditAdapter & {
  entries: AuditEntry[];
  clear: () => void;
};

export function memoryAdapter(): MemoryAdapter {
  const entries: AuditEntry[] = [];

  return {
    entries,
    add: async (entry: AuditEntry) => {
      entries.push(entry);
    },
    clear: () => {
      entries.length = 0;
    },
  };
}
