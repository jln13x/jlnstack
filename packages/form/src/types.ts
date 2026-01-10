export type FormSubmitHandler = () => void | Promise<void>;

export type FormProps = {
  id: string;
  ref: (node: HTMLFormElement | null) => void;
};

export type FormContextValue = {
  /**
   * Register a form with its submit handler.
   * Only one form can be registered at a time.
   * @returns Form props including id and ref to spread on the form element.
   * The ref handles automatic unregistration when the form unmounts.
   */
  registerForm: (onSubmit: FormSubmitHandler) => FormProps;

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
