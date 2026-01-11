"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormContextValue, FormProps, FormSubmitHandler } from "./types";

export type { FormContextValue, FormProps, FormSubmitHandler };

const FormContext = createContext<FormContextValue | null>(null);

export type FormProviderProps = {
  children: React.ReactNode;
};

export function FormProvider({ children }: FormProviderProps) {
  const [isFormRegistered, setIsFormRegistered] = useState(false);
  const generatedId = useId();
  const formId = `form-${generatedId}`;
  const onSubmitRef = useRef<FormSubmitHandler>(() => {});

  const ref = useCallback((node: HTMLFormElement | null) => {
    if (node) {
      setIsFormRegistered(true);
    } else {
      setIsFormRegistered(false);
    }
  }, []);

  const registerForm = useCallback(
    (onSubmit: FormSubmitHandler): FormProps => {
      onSubmitRef.current = onSubmit;
      return { id: formId, ref };
    },
    [formId, ref]
  );

  const submitForm = useCallback(() => {
    if (!isFormRegistered) {
      throw new Error(
        "Cannot submit form: no form is registered. Call registerForm first."
      );
    }
    return onSubmitRef.current();
  }, [isFormRegistered]);

  const value = useMemo<FormContextValue>(
    () => ({
      registerForm,
      isFormRegistered,
      submitForm,
      formId: isFormRegistered ? formId : undefined,
    }),
    [registerForm, isFormRegistered, submitForm, formId]
  );

  return <FormContext value={value}>{children}</FormContext>;
}

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}
