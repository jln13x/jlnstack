"use client";

import {
  type ReactNode,
  Suspense,
  use,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  AnyModal,
  Modal,
  ModalComponentOptions,
  ModalInstance,
  ServerModal,
  WithDefaults,
} from "../types";
import { isServerModal } from "../types";
import { useModalManager } from "./context";

const EMPTY_MODALS: ModalInstance[] = [];

/**
 * Component that uses React 19's `use()` to suspend until the promise resolves
 */
function ServerContent({ promise }: { promise: Promise<ReactNode> }) {
  const content = use(promise);
  return <>{content}</>;
}

/**
 * Hook for opening modals - works with both client and server modals
 *
 * @example
 * ```tsx
 * // Client modal
 * const alert = useModal(alertModal);
 * alert.open({ message: "Hello" });
 *
 * // Server modal
 * const user = useModal(userModal);
 * user.open({ userId: "123" });
 * ```
 */
export function useModal<
  TInput,
  TOutput,
  TDefaults extends Partial<TInput> = {},
>(modal: AnyModal<TInput, TOutput, TDefaults>) {
  const manager = useModalManager();

  const open = useCallback(
    (input: WithDefaults<TInput, TDefaults>): Promise<TOutput | undefined> => {
      if (isServerModal(modal)) {
        // Server modal - create dynamic modal def with Suspense
        const mergedInput = {
          ...modal._inputDefaults,
          ...(input as Record<string, unknown>),
        } as TInput;

        const contentPromise = modal._action(mergedInput) as Promise<ReactNode>;

        const dynamicDef = {
          _type: "modal" as const,
          _def: {
            component: (_input: TInput, _opts: ModalComponentOptions<TOutput>) => {
              return (
                <Suspense fallback={null}>
                  <ServerContent promise={contentPromise} />
                </Suspense>
              );
            },
          },
          _inputDefaults: {} as Partial<TInput>,
        };

        return manager.open(dynamicDef as Modal<TInput, TOutput>, mergedInput);
      }

      // Client modal - use directly
      return manager.open(modal as Modal<TInput, TOutput, TDefaults>, input as TInput);
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
