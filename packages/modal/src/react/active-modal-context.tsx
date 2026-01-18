"use client";

import { createContext, use, useMemo } from "react";

type ActiveModalContextValue = {
  open: boolean;
  close: () => void;
  resolve: (value: unknown) => void;
};

const ActiveModalContext = createContext<ActiveModalContextValue | null>(null);

function ActiveModalProvider({
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
  const value = useMemo(
    () => ({ open, close, resolve }),
    [open, close, resolve],
  );
  return <ActiveModalContext value={value}>{children}</ActiveModalContext>;
}

function useActiveModal(): ActiveModalContextValue {
  const ctx = use(ActiveModalContext);
  if (!ctx) {
    throw new Error("useActiveModal must be used within a ModalOutlet");
  }
  return ctx;
}

export { ActiveModalProvider, useActiveModal };
