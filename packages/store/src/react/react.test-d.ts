import { describe, expectTypeOf, it } from "vitest";
import { history } from "../core/plugins/history";
import { createReactStore } from "./react";

describe("createStore types", () => {
  const BearStore = createReactStore({
    state: (initial: { bears: number; name: string }) => ({
      bears: initial.bears,
      name: initial.name,
      fish: 10,
    }),
    actions: (store) => ({
      increasePopulation: (by: number) =>
        store.setState((state) => ({ ...state, bears: state.bears + by })),
      getName: () => store.getState().name,
    }),
  });

  it("infers Provider initialState type", () => {
    expectTypeOf(BearStore.Provider)
      .parameter(0)
      .toHaveProperty("initialState")
      .toEqualTypeOf<{ bears: number; name: string }>();
  });

  it("infers useStore selector return type", () => {
    expectTypeOf(BearStore.useStore<number>).returns.toEqualTypeOf<number>();
  });

  it("infers useActions return type", () => {
    expectTypeOf(BearStore.useActions).returns.toMatchTypeOf<{
      increasePopulation: (by: number) => void;
      getName: () => string;
    }>();
  });
});

describe("createReactStore with plugins", () => {
  const StoreWithHistory = createReactStore({
    state: (initial: { count: number }) => ({
      count: initial.count,
      name: "test",
    }),
    actions: (store) => ({
      increment: () =>
        store.setState((s) => ({ ...s, count: s.count + 1 })),
    }),
    plugins: [history()],
  });

  it("infers useExtensions return type with history plugin", () => {
    expectTypeOf(StoreWithHistory.useExtensions).returns.toHaveProperty(
      "history",
    );
  });

  it("history extension has correct methods", () => {
    expectTypeOf(
      StoreWithHistory.useExtensions,
    ).returns.toHaveProperty("history").toMatchTypeOf<{
      undo: () => void;
      redo: () => void;
      clear: () => void;
      canUndo: () => boolean;
      canRedo: () => boolean;
      pastStates: () => { count: number; name: string }[];
      futureStates: () => { count: number; name: string }[];
    }>();
  });
});
