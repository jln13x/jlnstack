import type { StoreApi } from "../../types";
import { definePlugin } from "../plugin";

interface LoggerOptions {
  name: string;
  enabled?: boolean;
}

export function logger(options: LoggerOptions) {
  const { enabled = true, name } = options;

  return definePlugin(<TState>(_store: StoreApi<TState>) => ({
    id: "logger",
    onStateChange: (state: TState, prevState: TState) => {
      if (!enabled) return;

      const changes = getChanges(prevState as object, state as object);
      if (Object.keys(changes).length === 0) return;

      console.log(
        `%c ${name} %c setState `,
        "background: #a3e635; color: black; padding: 2px;",
        "background: #65a30d; color: white; padding: 2px; font-weight: bold;",
        changes,
      );
    },
  }));
}

function getChanges(prev: object, next: object): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) {
      changes[key] = next[key as keyof typeof next];
    }
  }
  return changes;
}
