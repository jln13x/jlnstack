import type { ModalStore } from "./store";
import type { Modal, ModalInstance, OpenModalResult } from "./types";

export type CreateModalOptions<TOutput> = {
  store: ModalStore;
  onCleanup: (id: string) => void;
  onInstanceCreated: (id: string, instance: ModalInstance<TOutput>) => void;
};

export function openModal<TInput, TOutput>(
  modal: Modal<TInput, TOutput>,
  input: TInput,
  options: CreateModalOptions<TOutput>,
): OpenModalResult<TOutput> {
  const { store, onCleanup, onInstanceCreated } = options;
  const id = store.generateId();

  let resolvePromise!: (value: TOutput | undefined) => void;
  const promise = new Promise<TOutput | undefined>((resolve) => {
    resolvePromise = resolve;
  });

  const cleanup = () => {
    if (store.actions.has(id)) {
      store.actions.remove(id);
    }
    onCleanup(id);
  };

  const instance: ModalInstance<TOutput> = {
    id,
    order: 0,
    render: () =>
      modal._def.component(input, {
        resolve: (value) => {
          resolvePromise(value);
          cleanup();
        },
        close: () => {
          resolvePromise(undefined);
          cleanup();
        },
      }),
    resolve: (value) => {
      resolvePromise(value);
      cleanup();
    },
    close: () => {
      resolvePromise(undefined);
      cleanup();
    },
  };

  // Register instance BEFORE adding to store (avoids race condition with subscribers)
  onInstanceCreated(id, instance);

  store.actions.add(id);

  // Update order from store
  const storeModal = store.actions.get(id);
  if (storeModal) {
    instance.order = storeModal.order;
  }

  return {
    id,
    promise,
    instance,
  };
}
