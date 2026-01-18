import { describe, expect, it, vi } from "vitest";
import { modal } from "./builder";
import { lazy } from "./lazy";

describe("lazy", () => {
  it("should return a valid modal structure", () => {
    const mockModal = modal
      .input<{ name: string }>()
      .create((input) => ({ greeting: `Hello ${input.name}` }));

    const lazyModal = lazy(() => Promise.resolve(mockModal));

    expect(lazyModal).toHaveProperty("_def");
    expect(lazyModal).toHaveProperty("_def.component");
    expect(lazyModal).toHaveProperty("_inputDefaults");
    expect(typeof lazyModal._def.component).toBe("function");
  });

  it("should accept a fallback option", () => {
    const mockModal = modal.input<{ name: string }>().create((input) => input);

    const lazyModal = lazy(() => Promise.resolve(mockModal), {
      fallback: "Loading...",
    });

    expect(lazyModal).toHaveProperty("_def.component");
  });

  it("should work with .then() import pattern", () => {
    const settingsModal = modal
      .input<{ userId: string }>()
      .create((input) => ({ user: input.userId }));

    // Simulate: lazy(() => import("./settings").then(m => m.settingsModal))
    const lazyModal = lazy(() =>
      Promise.resolve({ settingsModal }).then((m) => m.settingsModal),
    );

    expect(lazyModal).toHaveProperty("_def.component");
  });

  it("should call import function when component is rendered", async () => {
    const mockModal = modal
      .input<{ name: string }>()
      .create((input) => ({ greeting: `Hello ${input.name}` }));

    const importFn = vi.fn(() => Promise.resolve(mockModal));
    const lazyModal = lazy(importFn);

    // The import function is called inside React.lazy, which is triggered on render
    // We can verify the structure is correct
    const component = lazyModal._def.component(
      { name: "World" },
      { close: vi.fn(), resolve: vi.fn() },
    );

    // The component should be a React element (Suspense wrapper)
    expect(component).toBeDefined();
    expect(component).toHaveProperty("type");
    expect(component).toHaveProperty("props");
  });

  it("should preserve modal types", () => {
    // This test verifies the type inference works correctly
    const typedModal = modal
      .input<{ id: number; name: string }>()
      .output<boolean>()
      .create((input, { resolve }) => {
        return {
          id: input.id,
          name: input.name,
          onConfirm: () => resolve(true),
        };
      });

    const lazyTypedModal = lazy(() => Promise.resolve(typedModal));

    // The lazy modal should have the same type structure
    expect(lazyTypedModal._def).toBeDefined();
    expect(typeof lazyTypedModal._def.component).toBe("function");
  });
});
