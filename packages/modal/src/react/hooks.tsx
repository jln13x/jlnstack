"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ModalInstanceState } from "../store";
import type { Modal, WithDefaults } from "../types";
import { useModalManager } from "./context";

const EMPTY_MODALS: ModalInstanceState[] = [];

export function useModal<
  TInput,
  TOutput,
  TDefaults extends Partial<TInput> = {},
>(modal: Modal<TInput, TOutput, TDefaults>) {
  const manager = useModalManager();

  const open = useCallback(
    (input: WithDefaults<TInput, TDefaults>): Promise<TOutput | undefined> => {
      return manager.open(modal, input as TInput);
    },
    [manager, modal],
  );

  return { open };
}

export function useModals() {
  const manager = useModalManager();

  // Use the store's getAll directly - it's already cached
  const modals = useSyncExternalStore(
    (cb) => manager.subscribe(cb),
    () => manager.store.actions.getAll(),
    () => EMPTY_MODALS,
  );

  const actions = useMemo(
    () => ({
      has: manager.has,
      isOnTop: manager.isOnTop,
      bringToFront: manager.bringToFront,
      sendToBack: manager.sendToBack,
      moveUp: manager.moveUp,
      moveDown: manager.moveDown,
      setPosition: manager.setPosition,
      updatePosition: manager.updatePosition,
      setSize: manager.setSize,
      close: manager.close,
      closeAll: manager.closeAll,
    }),
    [manager],
  );

  return {
    modals,
    count: modals.length,
    topModal: modals.at(-1),
    ...actions,
  };
}
