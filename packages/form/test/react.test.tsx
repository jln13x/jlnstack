import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormProvider, useFormContext } from "../src/react";

describe("useFormContext", () => {
  it("throws when used outside FormProvider", () => {
    expect(() => renderHook(() => useFormContext())).toThrow(
      "useFormContext must be used within a FormProvider"
    );
  });
});

describe("FormProvider", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider>{children}</FormProvider>
  );

  it("provides context to children", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.registerForm).toBeInstanceOf(Function);
    expect(result.current.unregisterForm).toBeInstanceOf(Function);
    expect(result.current.submitForm).toBeInstanceOf(Function);
  });

  it("initially has no form registered", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    expect(result.current.isFormRegistered).toBe(false);
    expect(result.current.formId).toBeUndefined();
  });
});

describe("registerForm", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider>{children}</FormProvider>
  );

  it("returns a form id", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    let id: string;

    act(() => {
      id = result.current.registerForm(() => {});
    });

    expect(id!).toBeDefined();
    expect(typeof id!).toBe("string");
    expect(id!.startsWith("form-")).toBe(true);
  });

  it("sets isFormRegistered to true", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });

    expect(result.current.isFormRegistered).toBe(false);

    act(() => {
      result.current.registerForm(() => {});
    });

    expect(result.current.isFormRegistered).toBe(true);
  });

  it("sets formId to the registered id", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    let id: string;

    act(() => {
      id = result.current.registerForm(() => {});
    });

    expect(result.current.formId).toBe(id!);
  });
});

describe("unregisterForm", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider>{children}</FormProvider>
  );

  it("clears the registration", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });

    act(() => {
      result.current.registerForm(() => {});
    });

    expect(result.current.isFormRegistered).toBe(true);

    act(() => {
      result.current.unregisterForm();
    });

    expect(result.current.isFormRegistered).toBe(false);
    expect(result.current.formId).toBeUndefined();
  });
});

describe("submitForm", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FormProvider>{children}</FormProvider>
  );

  it("throws when no form is registered", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });

    expect(() => result.current.submitForm()).toThrow(
      "Cannot submit form: no form is registered"
    );
  });

  it("calls the registered submit handler", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    const onSubmit = vi.fn();

    act(() => {
      result.current.registerForm(onSubmit);
    });

    act(() => {
      result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("handles async submit handlers", async () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.registerForm(onSubmit);
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
