"use client";

import { createContext, use, useMemo } from "react";

type InnerModalContextValue = {
  open: boolean;
  close: () => void;
};

const InnerModalContext = createContext<InnerModalContextValue | null>(null);

function InnerModalProvider({
  open,
  close,
  children,
}: {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ open, close }), [open, close]);
  return <InnerModalContext value={value}>{children}</InnerModalContext>;
}

function useInnerModal(): InnerModalContextValue {
  const ctx = use(InnerModalContext);
  if (!ctx) {
    throw new Error("useInnerModal must be used within a ModalOutlet");
  }
  return ctx;
}

export { InnerModalProvider, useInnerModal };
