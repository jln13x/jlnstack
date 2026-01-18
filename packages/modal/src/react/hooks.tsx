"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { Modal, ModalInstance } from "../types";
import { useModalManager } from "./context";

const EMPTY_MODALS: ModalInstance[] = [];

export function useModal<TInput, TOutput>(modal: Modal<TInput, TOutput>) {
  const manager = useModalManager();

  const open = useCallback(
    (input: TInput): Promise<TOutput | undefined> => {
      return manager.open(modal, input);
    },
    [manager, modal],
  );

  return { open };
}

export function useModals() {
  const manager = useModalManager();

  const cache = useRef<ModalInstance[]>(EMPTY_MODALS);

  const subscribe = useCallback(
    (cb: () => void) => {
      cache.current = manager.getAll();
      return manager.subscribe(() => {
        cache.current = manager.getAll();
        cb();
      });
    },
    [manager],
  );

  const getSnapshot = useCallback(() => cache.current, []);

  const modals = useSyncExternalStore(
    subscribe,
    getSnapshot,
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
