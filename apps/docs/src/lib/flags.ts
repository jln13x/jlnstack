import { createFlags, memoryAdapter } from "@jlnstack/flags";
import { createFlagsReact } from "@jlnstack/flags/react";

export const flags = createFlags({
  flags: ["darkMode", "newNavigation", "betaFeatures"] as const,
  adapter: memoryAdapter({
    flags: {
      darkMode: true,
      newNavigation: false,
      betaFeatures: false,
    },
  }),
});

export const { FlagsProvider, useFlags } = createFlagsReact(flags);
