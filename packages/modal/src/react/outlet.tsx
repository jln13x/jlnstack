"use client";

import { type ReactNode, useCallback, useSyncExternalStore } from "react";
import type { ModalInstanceState } from "../store";
import type { Position, Size } from "../types";
import { useModalManager } from "./context";

const EMPTY_MODALS: ModalInstanceState[] = [];

export function ModalOutlet() {
  const manager = useModalManager();

  // Use the store's getAll directly - it's already cached
  const modals = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.store.actions.getAll(),
    () => EMPTY_MODALS,
  );

  return (
    <>
      {modals.map((modal) => (
        <ModalRenderer key={modal.id} id={modal.id} />
      ))}
    </>
  );
}

function ModalRenderer({ id }: { id: string }) {
  const manager = useModalManager();
  const instance = manager.getInstance(id);

  const close = useCallback(() => instance?.close(), [instance]);
  const resolve = useCallback(
    (value: unknown) => instance?.resolve(value),
    [instance],
  );
  const setPosition = useCallback(
    (position: Position) => manager.setPosition(id, position),
    [manager, id],
  );
  const updatePosition = useCallback(
    (delta: Position) => manager.updatePosition(id, delta),
    [manager, id],
  );
  const setSize = useCallback(
    (size: Size) => manager.setSize(id, size),
    [manager, id],
  );

  if (!instance) return null;

  return (
    <ModalInstanceContext.Provider
      value={{
        id,
        close,
        resolve,
        setPosition,
        updatePosition,
        setSize,
      }}
    >
      {instance.render() as ReactNode}
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
