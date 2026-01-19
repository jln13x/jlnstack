export type Position = { x: number; y: number };
export type Size = { width: number; height: number };

export type ModalComponentOptions<TOutput> = {
  resolve: (value: TOutput) => void;
  close: () => void;
};

export type ModalDef<TInput, TOutput> = {
  component: (
    input: TInput,
    options: ModalComponentOptions<TOutput>,
  ) => unknown;
};

export type Modal<
  TInput,
  TOutput,
  TInputDefaults extends Partial<TInput> = {},
> = {
  _type: "modal";
  _def: ModalDef<TInput, TOutput>;
  _inputDefaults: TInputDefaults;
};

export type ServerModal<
  TInput,
  TOutput,
  TInputDefaults extends Partial<TInput> = {},
> = {
  _type: "serverModal";
  _action: (input: TInput) => Promise<unknown>;
  _inputDefaults: TInputDefaults;
  _inputType?: TInput;
  _outputType?: TOutput;
};

export type AnyModal<
  TInput,
  TOutput,
  TInputDefaults extends Partial<TInput> = {},
> = Modal<TInput, TOutput, TInputDefaults> | ServerModal<TInput, TOutput, TInputDefaults>;

export function isServerModal(
  value: unknown
): value is ServerModal<unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    (value as any)._type === "serverModal"
  );
}

export type TemplateContext<TOutput = unknown, TTemplateProps = unknown> = {
  modal: unknown;
  close: () => void;
  resolve: (value: TOutput) => void;
  props: TTemplateProps;
};

export type TemplateWrapper<TOutput = unknown, TTemplateProps = unknown> = (
  ctx: TemplateContext<TOutput, TTemplateProps>,
) => unknown;

export type WithDefaults<T, TDefaults> = Omit<T, keyof TDefaults> &
  Partial<Pick<T, Extract<keyof TDefaults, keyof T>>>;

export type ModalInstance<TOutput = unknown> = {
  id: string;
  order: number;
  position: Position;
  size: Size;
  render: () => unknown;
  resolve: (value: TOutput) => void;
  close: () => void;
};

export type OpenModalResult<TOutput> = {
  id: string;
  promise: Promise<TOutput | undefined>;
  instance: ModalInstance<TOutput>;
};
