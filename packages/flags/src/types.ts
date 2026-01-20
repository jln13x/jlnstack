export interface FlagAdapter {
  get(key: string, context?: unknown): Promise<boolean | null> | boolean | null;
  set?(key: string, value: boolean): Promise<void> | void;
}
