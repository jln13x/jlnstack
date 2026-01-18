export type ModalComponentOptions<TOutput> = {
  resolve: (value: TOutput) => void;
  close: () => void;
};

export type ModalDef<TInput, TOutput> = {
  component: (input: TInput, options: ModalComponentOptions<TOutput>) => unknown;
};

export type Modal<TInput, TOutput> = {
  _def: ModalDef<TInput, TOutput>;
};

export type ModalInstance<TOutput = unknown> = {
  id: string;
  order: number;
  render: () => unknown;
  resolve: (value: TOutput) => void;
  close: () => void;
};

export type OpenModalResult<TOutput> = {
  id: string;
  promise: Promise<TOutput | undefined>;
  instance: ModalInstance<TOutput>;
};
