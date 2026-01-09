import { createPlugin } from "../index";

interface LoggerOptions {
  name: string;
  enabled?: boolean;
}

export function logger(options: LoggerOptions) {
  const { enabled = true, name } = options;
  let currentAction: string | null = null;

  return createPlugin({
    id: "logger",
    onStateChange: (state, prevState) => {
      if (!enabled) return;

      const changes = getChanges(prevState as object, state as object);
      if (Object.keys(changes).length === 0) return;

      const actionName = currentAction ?? "setState";
      console.log(
        `%c ${name} %c ${actionName} `,
        "background: #a3e635; color: black; padding: 2px;",
        "background: #65a30d; color: white; padding: 2px; font-weight: bold;",
        changes,
      );
    },
    onActionsCreated: (actions) => {
      if (!enabled) return actions;

      return new Proxy(actions, {
        get(target, prop) {
          const value = target[prop as keyof typeof target];
          if (typeof value === "function") {
            return (...args: unknown[]) => {
              currentAction = String(prop);
              const result = (value as Function)(...args);
              currentAction = null;
              return result;
            };
          }
          return value;
        },
      });
    },
  });
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
