"use client";

import { type ReactNode, useCallback, useSyncExternalStore } from "react";
import type { ModalInstance, Position, Size } from "../types";
import { useModalManager } from "./context";

const EMPTY_MODALS: ModalInstance[] = [];

export function ModalOutlet() {
  const manager = useModalManager();

  const modals = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.getAll(),
    () => EMPTY_MODALS,
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
  const manager = useModalManager();

  const close = useCallback(() => modal.close(), [modal]);
  const resolve = useCallback(
    (value: unknown) => modal.resolve(value),
    [modal],
  );
  const setPosition = useCallback(
    (position: Position) => manager.setPosition(modal.id, position),
    [manager, modal.id],
  );
  const updatePosition = useCallback(
    (delta: Position) => manager.updatePosition(modal.id, delta),
    [manager, modal.id],
  );
  const setSize = useCallback(
    (size: Size) => manager.setSize(modal.id, size),
    [manager, modal.id],
  );

  return (
    <ModalInstanceContext.Provider
      value={{
        id: modal.id,
        close,
        resolve,
        setPosition,
        updatePosition,
        setSize,
      }}
    >
      {modal.render() as ReactNode}
    </ModalInstanceContext.Provider>
  );
}

import { createContext, use } from "react";

type ModalInstanceContextValue = {
  id: string;
  close: () => void;
  resolve: (value: unknown) => void;
  setPosition: (position: Position) => void;
  updatePosition: (delta: Position) => void;
  setSize: (size: Size) => void;
};

const ModalInstanceContext = createContext<ModalInstanceContextValue | null>(
  null,
);

export function useModalInstance(): ModalInstanceContextValue {
  const ctx = use(ModalInstanceContext);
  if (!ctx) {
    throw new Error("useModalInstance must be used within a modal component");
  }
  return ctx;
}
