"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import type { ModalManager } from "../manager";

const ModalManagerContext = createContext<ModalManager | null>(null);

export function ModalProvider({
  children,
  manager,
}: {
  children: ReactNode;
  manager: ModalManager;
}) {
  return (
    <ModalManagerContext.Provider value={manager}>
      {children}
    </ModalManagerContext.Provider>
  );
}

export function useModalManager(): ModalManager {
  const ctx = use(ModalManagerContext);
  if (!ctx) {
    throw new Error("useModalManager must be used within a ModalProvider");
  }
  return ctx;
}
