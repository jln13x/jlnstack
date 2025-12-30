type ModalComponentOptions<TOutput> = {
  resolve: (value: TOutput) => void;
};

type ModalDef<TInput, TOutput> = {
  component: (
    input: TInput,
    options: ModalComponentOptions<TOutput>,
  ) => unknown;
};

type ModalOptions<TInput, TOutput> = {
  _def: ModalDef<TInput, TOutput>;
  input?: TInput;
  onOpen?: (input: TInput) => void;
  onClose?: () => void;
  onResolve?: (output: TOutput) => void;
};

type ModalInstance = {
  open: boolean;
  render: () => unknown;
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  close: () => void;
};

type Listener = () => void;

type ModalClientState = {
  modals: ModalInstance[];
};

class ModalClient {
  private modals = new Map<ModalDef<unknown, unknown>, ModalInstance>();
  private listeners = new Set<Listener>();
  private cachedState: ModalClientState = { modals: [] };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.cachedState = { modals: Array.from(this.modals.values()) };
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  open<TInput, TOutput>(options: ModalOptions<TInput, TOutput>): Promise<any> {
    const def = options._def as ModalDef<unknown, unknown>;
    const input = options.input;
    if (!input) throw new Error("Modal input is required");

    options.onOpen?.(input);

    let resolvePromise: (value: unknown) => void;
    let rejectPromise: (error: unknown) => void;

    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const instance: ModalInstance = {
      open: true,
      render: () =>
        def.component(input, {
          resolve: (value: unknown) => {
            resolvePromise(value);
            options.onResolve?.(value as TOutput);
          },
        }),
      promise,
      resolve: resolvePromise!,
      reject: rejectPromise!,
      close: () => {
        options.onClose?.();
        this.dismiss(options);
      },
    };

    this.modals.set(def, instance);

    this.notify();

    return promise;
  }

  openAsync<TInput, TOutput>(
    modal: { _def: ModalDef<TInput, TOutput> },
    inputFn: () => TInput,
  ): Promise<TOutput> {
    const def = modal._def as ModalDef<unknown, unknown>;
    const input = inputFn();

    let resolvePromise: (value: unknown) => void;
    let rejectPromise: (error: unknown) => void;

    const promise = new Promise<TOutput>((resolve, reject) => {
      resolvePromise = resolve as (value: unknown) => void;
      rejectPromise = reject;
    });

    const closeFn = () => {
      const currentState = this.modals.get(def);
      if (currentState) {
        this.modals.set(def, { ...currentState, open: false });
        this.notify();
      }
    };

    const instance: ModalInstance = {
      open: true,
      render: () =>
        def.component(input, {
          resolve: (value: unknown) => {
            resolvePromise(value);
          },
        }),
      promise,
      resolve: resolvePromise!,
      reject: rejectPromise!,
      close: closeFn,
    };

    this.modals.set(def, instance);

    this.notify();

    return promise;
  }

  resolve<TInput, TOutput>(
    options: ModalOptions<TInput, TOutput>,
    value: TOutput,
  ): void {
    const def = options._def as ModalDef<unknown, unknown>;
    const instance = this.modals.get(def);
    if (instance) {
      instance.resolve(value);
      options.onResolve?.(value);
      this.modals.delete(def);
      this.notify();
    }
  }

  dismiss<TInput, TOutput>(options: ModalOptions<TInput, TOutput>): void {
    const def = options._def as ModalDef<unknown, unknown>;
    const currentState = this.modals.get(def);
    if (currentState) {
      this.modals.set(def, { ...currentState, open: false });
      this.notify();
    }
  }

  remove<TInput, TOutput>(options: ModalOptions<TInput, TOutput>): void {
    const def = options._def as ModalDef<unknown, unknown>;

    const instance = this.modals.get(def);
    if (instance) {
      instance.reject(new Error("Modal removed"));
    }

    this.modals.delete(def);

    this.notify();
  }

  getState(): ModalClientState {
    return this.cachedState;
  }
}

export {
  ModalClient,
  type ModalDef,
  type ModalOptions,
  type ModalInstance,
  type ModalComponentOptions,
};
