import { openModal } from "./open";
import {
  createModalStore,
  type ModalStore,
  type ModalStoreOptions,
} from "./store";
import type { Modal, ModalInstance, Position, Size } from "./types";

export type ModalManagerOptions = ModalStoreOptions;

export type ModalManager = {
  open: <TInput, TOutput>(
    modal: Modal<TInput, TOutput>,
    input: TInput,
  ) => Promise<TOutput | undefined>;

  getAll: () => ModalInstance[];
  getTopModal: () => ModalInstance | undefined;
  has: (id: string) => boolean;
  isOnTop: (id: string) => boolean;

  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;

  setPosition: (id: string, position: Position) => void;
  updatePosition: (id: string, delta: Position) => void;
  setSize: (id: string, size: Size) => void;

  close: (id: string) => void;
  closeAll: () => void;

  subscribe: (listener: () => void) => () => void;

  store: ModalStore;
};

export function createModalManager(
  options: ModalManagerOptions = {},
): ModalManager {
  const store = createModalStore(options);
  const instances = new Map<string, ModalInstance>();

  function getInstanceOrThrow(id: string): ModalInstance {
    const instance = instances.get(id);
    if (!instance) throw new Error(`Modal instance "${id}" not found`);
    return instance;
  }

  return {
    open: <TInput, TOutput>(
      modal: Modal<TInput, TOutput>,
      input: TInput,
    ): Promise<TOutput | undefined> => {
      const result = openModal(modal, input, {
        store,
        onCleanup: (id) => instances.delete(id),
        onInstanceCreated: (id, instance) =>
          instances.set(id, instance as ModalInstance),
      });

      return result.promise;
    },

    getAll: () => {
      return store.actions.getAll().map((m) => {
        const instance = getInstanceOrThrow(m.id);
        instance.order = m.order;
        instance.position = m.position;
        instance.size = m.size;
        return instance;
      });
    },

    getTopModal: () => {
      const top = store.actions.getTopModal();
      if (!top) return undefined;
      return instances.get(top.id);
    },

    has: (id: string) => store.actions.has(id),

    isOnTop: (id: string) => store.actions.isOnTop(id),

    bringToFront: (id: string) => store.actions.bringToFront(id),

    sendToBack: (id: string) => store.actions.sendToBack(id),

    moveUp: (id: string) => store.actions.moveUp(id),

    moveDown: (id: string) => store.actions.moveDown(id),

    setPosition: (id: string, position: Position) =>
      store.actions.setPosition(id, position),

    updatePosition: (id: string, delta: Position) =>
      store.actions.updatePosition(id, delta),

    setSize: (id: string, size: Size) => store.actions.setSize(id, size),

    close: (id: string) => {
      const instance = instances.get(id);
      if (instance) {
        instance.close();
      }
    },

    closeAll: () => {
      for (const instance of instances.values()) {
        instance.close();
      }
    },

    subscribe: (listener: () => void) => store.store.subscribe(listener),

    store,
  };
}
