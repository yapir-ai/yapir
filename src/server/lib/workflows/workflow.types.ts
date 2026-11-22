import type { Workflow } from "./workflow";

type Handler = (...args: never[]) => void;

type Handlers<W> = {
  [
    K in keyof W as K extends keyof Workflow<unknown>
      ? never
      : W[K] extends Handler
        ? K
        : never
  ]: W[K];
};

export type Signals<W> = {
  [K in keyof Handlers<W>]: Handlers<W>[K] extends (...args: infer Args) => void
    ? (...args: Args) => void
    : never;
};

export type Updates<W> = {
  [K in keyof Handlers<W>]: Handlers<W>[K] extends (
    ...args: infer Args
  ) => infer Reply
    ? (...args: Args) => Promise<Reply>
    : never;
};

export type Child<W extends Workflow<unknown>> = Signals<W> & {
  readonly id: string;
  readonly result: ReturnType<W["run"]>;
};

export type ParentHandle<Parent> = [Parent] extends [never]
  ? never
  : Signals<Parent> & { readonly id: string };
