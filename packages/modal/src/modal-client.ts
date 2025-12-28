type Modal<TInput> = {
  $types: {
    input: TInput;
  };
  _render: <T>(input: TInput) => T;
};

type ModalInstance = {
  open: boolean;
  render: () => any;
};

type Listener = () => void;

type ModalClientState = {
  modals: ModalInstance[];
};

class ModalClient {
  private modals = new Map<Modal<any>, ModalInstance>();
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  add<T>(modal: Modal<T>, input: T): void {
    this.modals.set(modal, {
      open: true,
      render: () => modal._render(input),
    });

    this.notify();
  }

  dismiss(modal: Modal<any>): void {
    const currentState = this.modals.get(modal);
    if (currentState) {
      this.modals.set(modal, {
        ...currentState,
        open: false,
      });
    }

    this.notify();
  }

  remove(modal: Modal<any>): void {
    this.modals.delete(modal);
    this.notify();
  }

  getState(): ModalClientState {
    return {
      modals: Array.from(this.modals.values()),
    };
  }
}

export { ModalClient, type Modal };
