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

type Listener = () => void;

type ModalClientState = {
  modals: ModalInstance[];
};

class ModalClient {
  private counter = 0;
  private modals = new Map<string, ModalInstance>();
  private listeners = new Set<Listener>();
  private cachedState: ModalClientState = { modals: [] };

  private generateId(): string {
    return `m-${++this.counter}`;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const sorted = Array.from(this.modals.values()).sort(
      (a, b) => a.order - b.order,
    );
    this.cachedState = { modals: sorted };
    for (const listener of this.listeners) {
      listener();
    }
  }

  open<TInput, TOutput>(
    modal: Modal<TInput, TOutput>,
    input: TInput,
  ): Promise<TOutput | undefined> {
    const id = this.generateId();
    const order = this.counter;

    let resolvePromise!: (value: TOutput | undefined) => void;

    const promise = new Promise<TOutput | undefined>((resolve) => {
      resolvePromise = resolve;
    });

    const cleanup = () => {
      this.modals.delete(id);
      this.notify();
    };

    const instance: ModalInstance<TOutput> = {
      id,
      order,
      open: true,
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

    this.modals.set(id, instance as ModalInstance);
    this.notify();

    return promise;
  }

  getState(): ModalClientState {
    return this.cachedState;
  }
}

export {
  ModalClient,
  type Modal,
  type ModalDef,
  type ModalInstance,
  type ModalComponentOptions,
  type ModalClientState,
};
