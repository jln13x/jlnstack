import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormProvider, useFormContext } from "../src/react";
import type { FormProps } from "../src/types";

describe("useFormContext", () => {
  it("throws when used outside FormProvider", () => {
    expect(() => renderHook(() => useFormContext())).toThrow(
      "useFormContext must be used within a FormProvider",
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

  it("returns form props with id and ref", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    let formProps: FormProps | undefined;

    act(() => {
      formProps = result.current.registerForm(() => {});
    });

    expect(formProps).toBeDefined();
    expect(formProps?.id).toBeDefined();
    expect(typeof formProps?.id).toBe("string");
    expect(formProps?.id.startsWith("form-")).toBe(true);
    expect(formProps?.ref).toBeInstanceOf(Function);
  });

  it("sets isFormRegistered to true when ref is called with a node", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });

    expect(result.current.isFormRegistered).toBe(false);

    let formProps!: FormProps;
    act(() => {
      formProps = result.current.registerForm(() => {});
    });

    act(() => {
      formProps.ref(document.createElement("form"));
    });

    expect(result.current.isFormRegistered).toBe(true);
  });

  it("sets formId when form is registered", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    let formProps!: FormProps;

    act(() => {
      formProps = result.current.registerForm(() => {});
    });

    act(() => {
      formProps.ref(document.createElement("form"));
    });

    expect(result.current.formId).toBe(formProps.id);
  });

  it("unregisters when ref is called with null", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    let formProps!: FormProps;

    act(() => {
      formProps = result.current.registerForm(() => {});
    });

    act(() => {
      formProps.ref(document.createElement("form"));
    });

    expect(result.current.isFormRegistered).toBe(true);

    act(() => {
      formProps.ref(null);
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
      "Cannot submit form: no form is registered",
    );
  });

  it("calls the registered submit handler", () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    const onSubmit = vi.fn();
    let formProps!: FormProps;

    act(() => {
      formProps = result.current.registerForm(onSubmit);
    });

    act(() => {
      formProps.ref(document.createElement("form"));
    });

    act(() => {
      result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("handles async submit handlers", async () => {
    const { result } = renderHook(() => useFormContext(), { wrapper });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    let formProps!: FormProps;

    act(() => {
      formProps = result.current.registerForm(onSubmit);
    });

    act(() => {
      formProps.ref(document.createElement("form"));
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
