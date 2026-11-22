import type { InferInsertModel, Table } from "drizzle-orm";

type Handler = (...args: never[]) => void;

interface Runnable {
  run: (...args: never[]) => Promise<object>;
}

type Handlers<W> = {
  [
    K in keyof W as K extends keyof Workflow | "run" | "row"
      ? never
      : W[K] extends Handler
        ? K
        : never
  ]: W[K];
};

type Signals<W> = {
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

export type Child<W extends Runnable> = Signals<W> & {
  readonly result: ReturnType<W["run"]>;
};

export interface Row {
  table: Table;
  values: object;
}

export declare abstract class Workflow<Parent = never> {
  readonly id: string;
  readonly now: number;
  readonly parent: [Parent] extends [never]
    ? never
    : Signals<Parent> & { readonly id: string };

  protected until(
    condition: () => boolean,
    options?: { deadline: () => number }
  ): Promise<boolean>;

  protected start<W extends Workflow<unknown> & Runnable>(
    workflow: new () => W,
    ...args: Parameters<W["run"]>
  ): Child<W>;
}

export declare function project<Projection extends Table>(
  table: Projection,
  values: InferInsertModel<Projection>
): Row;

export declare function inject<Activity>(
  operation: (...deps: never[]) => Activity
): Activity;

export declare const engine: {
  start: <W extends Workflow & Runnable>(
    workflow: new () => W,
    id: string,
    ...args: Parameters<W["run"]>
  ) => Updates<W>;
  get: <W extends Workflow<unknown>>(
    workflow: new () => W,
    id: string
  ) => Updates<W>;
  register: <Activity>(
    operation: (...deps: never[]) => Activity,
    activity: Activity
  ) => void;
};
