"use client";

import { createContext, use, useMemo } from "react";

type InnerModalContextValue = {
  open: boolean;
  close: () => void;
  resolve: (value: unknown) => void;
};

const InnerModalContext = createContext<InnerModalContextValue | null>(null);

function InnerModalProvider({
  open,
  close,
  resolve,
  children,
}: {
  open: boolean;
  close: () => void;
  resolve: (value: unknown) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ open, close, resolve }), [open, close, resolve]);
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
