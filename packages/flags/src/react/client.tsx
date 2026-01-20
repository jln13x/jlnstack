"use client";

import { createContext, useContext, type ReactNode } from "react";

const FlagsContext = createContext<Record<string, boolean> | null>(null);

export function FlagsClientProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Record<string, boolean>;
}) {
  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlagsInternal(): Record<string, boolean> {
  const value = useContext(FlagsContext);
  if (value === null) {
    throw new Error("useFlags must be used within FlagsProvider");
  }
  return value;
}
