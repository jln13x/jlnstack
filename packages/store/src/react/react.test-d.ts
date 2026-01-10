import { describe, expectTypeOf, it } from "vitest";
import { createReactStore } from "./react";

describe("createStore types", () => {
  const BearStore = createReactStore({
    name: "BearStore",
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
