export type FormSubmitHandler = () => void | Promise<void>;

export type FormRegistration = {
  id: string;
  onSubmit: FormSubmitHandler;
};

export type FormContextValue = {
  /**
   * Register a form with its submit handler.
   * Only one form can be registered at a time.
   * @returns The form id to use as the form element's id attribute
   */
  registerForm: (onSubmit: FormSubmitHandler) => string;

  /**
   * Unregister the currently registered form.
   */
  unregisterForm: () => void;

  /**
   * Whether a form is currently registered.
   */
  isFormRegistered: boolean;

  /**
   * Submit the registered form.
   * @throws Error if no form is registered
   */
  submitForm: () => void | Promise<void>;

  /**
   * The id of the currently registered form, or undefined if none.
   * Use this for the form attribute on buttons outside the form.
   */
  formId: string | undefined;
};
