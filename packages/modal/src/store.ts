import { createStore } from "@jlnstack/store";
import type { Position, Size } from "./types";

export type ModalInstanceState = {
  id: string;
  order: number;
  open: boolean;
  position?: Position;
  size?: Size;
};

type ModalStoreState = {
  modals: Record<string, ModalInstanceState>;
};

type StoreApi<TState> = {
  setState: (updater: TState | ((state: TState) => TState)) => void;
  getState: () => TState;
  subscribe: (listener: () => void) => () => void;
};

function error(message: string): never {
  throw new Error(message);
}

export type AddModalOptions = {
  position?: Position;
  size?: Size;
};

export type ModalStoreActions = {
  add: (id: string, options?: AddModalOptions) => void;
  remove: (id: string) => void;
  get: (id: string) => ModalInstanceState | undefined;
  has: (id: string) => boolean;

  getAll: () => ModalInstanceState[];
  getTopModal: () => ModalInstanceState | undefined;
  getBottomModal: () => ModalInstanceState | undefined;
  getIndex: (id: string) => number;
  isOnTop: (id: string) => boolean;
  count: () => number;

  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;

  setPosition: (id: string, position: Position) => void;
  updatePosition: (id: string, delta: Position) => void;
  setSize: (id: string, size: Size) => void;

  closeAll: () => void;
};

export type ModalStore = {
  state: ModalStoreState;
  actions: ModalStoreActions;
  store: StoreApi<ModalStoreState>;
  generateId: () => string;
};

export type ModalStoreOptions = {
  idPrefix?: string;
};

export function createModalStore(options: ModalStoreOptions = {}): ModalStore {
  const idPrefix = options.idPrefix ?? "m";
  let idCounter = 0;

  function generateId(): string {
    return `${idPrefix}-${++idCounter}`;
  }

  let cachedSortedModals: ModalInstanceState[] = [];
  let cachedModalsRef: Record<string, ModalInstanceState> | null = null;

  function getSortedModals(state: ModalStoreState): ModalInstanceState[] {
    if (state.modals !== cachedModalsRef) {
      cachedSortedModals = Object.values(state.modals).sort(
        (a, b) => a.order - b.order,
      );
      cachedModalsRef = state.modals;
    }
    return cachedSortedModals;
  }

  function normalizeOrders(
    modals: Record<string, ModalInstanceState>,
  ): Record<string, ModalInstanceState> {
    const sorted = Object.values(modals).sort((a, b) => a.order - b.order);
    const result: Record<string, ModalInstanceState> = {};
    sorted.forEach((modal, index) => {
      result[modal.id] = { ...modal, order: index + 1 };
    });
    return result;
  }

  function assertExists(
    state: ModalStoreState,
    id: string,
  ): ModalInstanceState {
    const modal = state.modals[id];
    if (!modal) error(`Modal with id "${id}" not found`);
    return modal;
  }

  const store = createStore({
    state: {
      modals: {},
    } as ModalStoreState,
    actions: (s): ModalStoreActions => ({
      add: (id: string, options?: AddModalOptions) => {
        s.setState((state) => {
          if (state.modals[id]) {
            error(`Modal with id "${id}" already exists`);
          }
          const count = Object.keys(state.modals).length;
          return {
            ...state,
            modals: {
              ...state.modals,
              [id]: {
                id,
                order: count + 1,
                open: true,
                position: options?.position,
                size: options?.size,
              },
            },
          };
        });
      },

      remove: (id: string) => {
        s.setState((state) => {
          assertExists(state, id);
          const { [id]: _, ...rest } = state.modals;
          return { ...state, modals: normalizeOrders(rest) };
        });
      },

      get: (id: string) => {
        return s.getState().modals[id];
      },

      has: (id: string) => {
        return id in s.getState().modals;
      },

      getAll: () => {
        return getSortedModals(s.getState());
      },

      getTopModal: () => {
        return getSortedModals(s.getState()).at(-1);
      },

      getBottomModal: () => {
        return getSortedModals(s.getState()).at(0);
      },

      getIndex: (id: string) => {
        const state = s.getState();
        assertExists(state, id);
        return getSortedModals(state).findIndex((m) => m.id === id);
      },

      isOnTop: (id: string) => {
        const state = s.getState();
        assertExists(state, id);
        return getSortedModals(state).at(-1)?.id === id;
      },

      count: () => {
        return Object.keys(s.getState().modals).length;
      },

      bringToFront: (id: string) => {
        s.setState((state) => {
          const modal = assertExists(state, id);
          const maxOrder = Math.max(
            ...Object.values(state.modals).map((m) => m.order),
          );
          if (modal.order === maxOrder) return state;

          return {
            ...state,
            modals: normalizeOrders({
              ...state.modals,
              [id]: { ...modal, order: maxOrder + 1 },
            }),
          };
        });
      },

      sendToBack: (id: string) => {
        s.setState((state) => {
          const modal = assertExists(state, id);
          const minOrder = Math.min(
            ...Object.values(state.modals).map((m) => m.order),
          );
          if (modal.order === minOrder) return state;

          return {
            ...state,
            modals: normalizeOrders({
              ...state.modals,
              [id]: { ...modal, order: minOrder - 1 },
            }),
          };
        });
      },

      moveUp: (id: string) => {
        s.setState((state) => {
          assertExists(state, id);
          const sorted = getSortedModals(state);
          const index = sorted.findIndex((m) => m.id === id);
          if (index === sorted.length - 1) return state;

          const current = sorted.at(index);
          const above = sorted.at(index + 1);
          if (!current || !above) return state;

          return {
            ...state,
            modals: {
              ...state.modals,
              [current.id]: { ...current, order: above.order },
              [above.id]: { ...above, order: current.order },
            },
          };
        });
      },

      moveDown: (id: string) => {
        s.setState((state) => {
          assertExists(state, id);
          const sorted = getSortedModals(state);
          const index = sorted.findIndex((m) => m.id === id);
          if (index === 0) return state;

          const current = sorted.at(index);
          const below = sorted.at(index - 1);
          if (!current || !below) return state;

          return {
            ...state,
            modals: {
              ...state.modals,
              [current.id]: { ...current, order: below.order },
              [below.id]: { ...below, order: current.order },
            },
          };
        });
      },

      setPosition: (id: string, position: Position) => {
        s.setState((state) => {
          const modal = assertExists(state, id);
          return {
            ...state,
            modals: {
              ...state.modals,
              [id]: { ...modal, position },
            },
          };
        });
      },

      updatePosition: (id: string, delta: Position) => {
        s.setState((state) => {
          const modal = assertExists(state, id);
          if (!modal.position) return state;
          return {
            ...state,
            modals: {
              ...state.modals,
              [id]: {
                ...modal,
                position: {
                  x: modal.position.x + delta.x,
                  y: modal.position.y + delta.y,
                },
              },
            },
          };
        });
      },

      setSize: (id: string, size: Size) => {
        s.setState((state) => {
          const modal = assertExists(state, id);
          return {
            ...state,
            modals: {
              ...state.modals,
              [id]: { ...modal, size },
            },
          };
        });
      },

      closeAll: () => {
        s.setState({ modals: {} });
      },
    }),
  });

  return {
    state: store.state,
    actions: store.actions,
    store: store.store,
    generateId,
  };
}
