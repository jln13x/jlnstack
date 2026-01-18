"use client";

import * as React from "react";
import { createContext } from "react";

import type { ModalClient } from "../modal-client";

const ModalContext = createContext<ModalClient | null>(null);

export function ModalClientProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client: ModalClient;
}) {
  return (
    <ModalContext.Provider value={client}>{children}</ModalContext.Provider>
  );
}

export function useModalClient() {
  const ctx = React.useContext(ModalContext);

  if (!ctx) {
    throw new Error("useModalClient must be used within a ModalClientProvider");
  }

  return ctx;
}
