import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createStore } from "./react";

const BearStore = createStore({
  name: "BearStore",
  state: (initialBears: number) => ({
    bears: initialBears,
    fish: 10,
  }),
  actions: (set) => ({
    increasePopulation: (by: number) =>
      set((state) => ({ ...state, bears: state.bears + by })),
    eatFish: () => set((state) => ({ ...state, fish: state.fish - 1 })),
  }),
});

const wrapper =
  (initialState: number) =>
  ({ children }: { children: ReactNode }) => (
    <BearStore.Provider initialState={initialState}>
      {children}
    </BearStore.Provider>
  );

describe("createStore", () => {
  describe("Provider", () => {
    it("initializes state from props", () => {
      const { result } = renderHook(() => BearStore.useStore((s) => s.bears), {
        wrapper: wrapper(42),
      });
      expect(result.current).toBe(42);
    });

    it("isolates state between instances", () => {
      const { result: result1 } = renderHook(
        () => BearStore.useStore((s) => s.bears),
        { wrapper: wrapper(10) },
      );
      const { result: result2 } = renderHook(
        () => BearStore.useStore((s) => s.bears),
        { wrapper: wrapper(20) },
      );

      expect(result1.current).toBe(10);
      expect(result2.current).toBe(20);
    });
  });

  describe("useStore", () => {
    it("throws when used outside Provider", () => {
      expect(() => {
        renderHook(() => BearStore.useStore((s) => s.bears));
      }).toThrow("Missing BearStore Provider");
    });

    it("selects specific state", () => {
      const { result } = renderHook(() => BearStore.useStore((s) => s.fish), {
        wrapper: wrapper(5),
      });
      expect(result.current).toBe(10);
    });
  });

  describe("useActions", () => {
    it("throws when used outside Provider", () => {
      expect(() => {
        renderHook(() => BearStore.useActions());
      }).toThrow("Missing BearStore Provider");
    });

    it("returns actions that update state", () => {
      const { result: storeResult } = renderHook(
        () => BearStore.useStore((s) => s.bears),
        { wrapper: wrapper(5) },
      );
      const { result: actionsResult } = renderHook(
        () => BearStore.useActions(),
        { wrapper: wrapper(5) },
      );

      act(() => {
        actionsResult.current.increasePopulation(3);
      });

      expect(storeResult.current).toBe(5);
    });

    it("returns stable reference across renders", () => {
      const { result, rerender } = renderHook(() => BearStore.useActions(), {
        wrapper: wrapper(5),
      });

      const firstActions = result.current;
      rerender();
      const secondActions = result.current;

      expect(firstActions).toBe(secondActions);
    });
  });
});
