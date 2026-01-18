"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { ModalInstance } from "../types";
import { useModalManager } from "./context";

export function ModalOutlet() {
  const manager = useModalManager();

  const modals = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.getAll(),
    () => [],
  );

  return (
    <>
      {modals.map((modal) => (
        <ModalRenderer key={modal.id} modal={modal} />
      ))}
    </>
  );
}

function ModalRenderer({ modal }: { modal: ModalInstance }) {
  const close = useCallback(() => modal.close(), [modal]);
  const resolve = useCallback((value: unknown) => modal.resolve(value), [modal]);

  return (
    <ModalInstanceContext.Provider value={{ close, resolve }}>
      {modal.render() as ReactNode}
    </ModalInstanceContext.Provider>
  );
}

import { createContext, use } from "react";

type ModalInstanceContextValue = {
  close: () => void;
  resolve: (value: unknown) => void;
};

const ModalInstanceContext = createContext<ModalInstanceContextValue | null>(null);

export function useModalInstance(): ModalInstanceContextValue {
  const ctx = use(ModalInstanceContext);
  if (!ctx) {
    throw new Error("useModalInstance must be used within a modal component");
  }
  return ctx;
}
