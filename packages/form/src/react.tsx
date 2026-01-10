"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import type { FormContextValue, FormRegistration, FormSubmitHandler } from "./types";

export type { FormContextValue, FormRegistration, FormSubmitHandler };

const FormContext = createContext<FormContextValue | null>(null);

export type FormProviderProps = {
  children: React.ReactNode;
};

export function FormProvider({ children }: FormProviderProps) {
  const [registration, setRegistration] = useState<FormRegistration | null>(
    null
  );
  const generatedId = useId();

  const registerForm = useCallback(
    (onSubmit: FormSubmitHandler): string => {
      const id = `form-${generatedId}`;
      setRegistration({ id, onSubmit });
      return id;
    },
    [generatedId]
  );

  const unregisterForm = useCallback(() => {
    setRegistration(null);
  }, []);

  const submitForm = useCallback(() => {
    if (!registration) {
      throw new Error(
        "Cannot submit form: no form is registered. Call registerForm first."
      );
    }
    return registration.onSubmit();
  }, [registration]);

  const value = useMemo<FormContextValue>(
    () => ({
      registerForm,
      unregisterForm,
      isFormRegistered: registration !== null,
      submitForm,
      formId: registration?.id,
    }),
    [registerForm, unregisterForm, registration, submitForm]
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
