import { createModalStore, type ModalInstanceState } from "./store";

type ModalComponentOptions<TOutput> = {
  resolve: (value: TOutput) => void;
  close: () => void;
};

type ModalDef<TInput, TOutput> = {
  component: (input: TInput, options: ModalComponentOptions<TOutput>) => unknown;
};

type Modal<TInput, TOutput> = {
  _def: ModalDef<TInput, TOutput>;
};

type ModalInstance<TOutput = unknown> = {
  id: string;
  order: number;
  open: boolean;
  render: () => unknown;
  resolve: (value: TOutput) => void;
  close: () => void;
};

type ModalClientState = {
  modals: ModalInstance[];
};

/**
 * ModalClient powered by @jlnstack/store
 *
 * The store manages:
 * - Modal registry (which modals are open)
 * - Z-order/stacking (which modal is on top)
 *
 * The client manages:
 * - Promise resolvers (not serializable)
 * - Render functions (not serializable)
 */
class ModalClientWithStore {
  private store = createModalStore();
  private resolvers = new Map<string, (value: unknown) => void>();
  private renderers = new Map<string, () => unknown>();

  subscribe(listener: () => void): () => void {
    return this.store.store.subscribe(listener);
  }

  open<TInput, TOutput>(
    modal: Modal<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput | undefined> {
    const id = this.store.generateId();

    let resolvePromise!: (value: TOutput | undefined) => void;
    const promise = new Promise<TOutput | undefined>((resolve) => {
      resolvePromise = resolve;
    });

    const cleanup = () => {
      this.store.actions.remove(id);
      this.resolvers.delete(id);
      this.renderers.delete(id);
    };

    // Store the resolver for later use
    this.resolvers.set(id, resolvePromise as (value: unknown) => void);

    // Store the renderer
    this.renderers.set(id, () =>
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
    );

    // Add to store (automatically gets highest z-order)
    this.store.actions.add(id);

    return promise;
  }

  // Expose store actions for window management
  bringToFront(id: string): void {
    this.store.actions.bringToFront(id);
  }

  sendToBack(id: string): void {
    this.store.actions.sendToBack(id);
  }

  isOnTop(id: string): boolean {
    return this.store.actions.isOnTop(id);
  }

  getTopModal(): ModalInstance | undefined {
    const top = this.store.actions.getTopModal();
    if (!top) return undefined;
    return this.buildModalInstance(top);
  }

  closeAll(): void {
    // Resolve all promises with undefined before clearing
    for (const resolver of this.resolvers.values()) {
      resolver(undefined);
    }
    this.resolvers.clear();
    this.renderers.clear();
    this.store.actions.closeAll();
  }

  getState(): ModalClientState {
    const storeModals = this.store.actions.getAll();

    return {
      modals: storeModals.map((m) => this.buildModalInstance(m)),
    };
  }

  private buildModalInstance(m: ModalInstanceState): ModalInstance {
    return {
      id: m.id,
      order: m.order,
      open: m.open,
      render: this.renderers.get(m.id)!,
      resolve: (value: unknown) => {
        const resolver = this.resolvers.get(m.id);
        if (resolver) {
          resolver(value);
          this.store.actions.remove(m.id);
          this.resolvers.delete(m.id);
          this.renderers.delete(m.id);
        }
      },
      close: () => {
        const resolver = this.resolvers.get(m.id);
        if (resolver) {
          resolver(undefined);
          this.store.actions.remove(m.id);
          this.resolvers.delete(m.id);
          this.renderers.delete(m.id);
        }
      },
    };
  }
}

export {
  ModalClientWithStore,
  type Modal,
  type ModalDef,
  type ModalInstance,
  type ModalComponentOptions,
  type ModalClientState,
};
