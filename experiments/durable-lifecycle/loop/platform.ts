// A homemade durable execution platform: what a lifecycle author imports.
//
// A workflow is a class. Its fields are its state, `run()` is its story, its
// public methods are its messages, its public fields and getters are what the
// outside reads. The platform journals what reaches an entity and its children,
// and replays their classes on that journal after a restart.

abstract class Durable<Result, Outside> {
  readonly #host: Host<unknown, Outside>;

  constructor(host: Host<unknown, Outside>) {
    this.#host = host;
  }

  /** The identity. The platform makes the ID of a child: lifecycle code never invents one. */
  get id() {
    return this.#host.id;
  }

  /** The calls that leave the platform. The journal keeps each answer: a replay does not call again. */
  protected get outside() {
    return this.#host.outside;
  }

  /** Waits until `condition` holds, and gives true. Gives false when `timeout` ms pass first. */
  protected async until(condition: () => boolean, timeout?: number) {
    return await this.#host.until(condition, timeout);
  }

  /** Starts a child workflow. It lives in the journal of its entity: the two never race. */
  protected start<Input, W extends Workflow<Input, unknown, Outside>>(
    Class: new (host: Host<Input, Outside>) => W,
    input: NoInfer<Input>
  ): Child<W> {
    return this.#host.start(Class, input);
  }

  /** The story. It awaits only `until`, `outside` calls and the result of a child. */
  abstract run(): Promise<Result>;
}

/**
 * A workflow that lives forever under an ID that the outside chooses, from its first message.
 * `run()` tells one cycle of its life. When it returns, the platform saves the fields,
 * forgets the journal and calls `run()` again.
 */
export abstract class Entity<Outside> extends Durable<void, Outside> {}

/** A workflow that an entity starts with an input, and that ends with a result. Its messages still answer after its end. */
export abstract class Workflow<Input, Result, Outside> extends Durable<
  Result,
  Outside
> {
  readonly #input: Input;

  constructor(host: Host<Input, Outside>) {
    super(host);
    this.#input = host.input;
  }

  protected get input() {
    return this.#input;
  }
}

type Method = (...args: never[]) => unknown;

/** A child, as its parent holds it: its ID, its result, its public fields to read and its messages to call. */
export type Child<W extends { run: () => Promise<unknown> }> = Readonly<
  Omit<W, "run">
> & { readonly result: ReturnType<W["run"]> };

/** The messages of a class, as the outside sends them: its public methods. Each gives the answer of the method. */
export type Messages<W> = {
  [
    Name in keyof W as Name extends "run"
      ? never
      : W[Name] extends Method
        ? Name
        : never
  ]: W[Name] extends (...args: infer Args) => infer Answer
    ? (...args: Args) => Promise<Awaited<Answer>>
    : never;
};

/** The state of a class, as the outside reads it: its public fields and getters. */
export type State<W> = {
  readonly [Name in keyof W as W[Name] extends Method ? never : Name]: W[Name];
};

type WorkflowClass<W> = abstract new (host: never) => W;

/** The platform, as the routes and the pages use it. */
export interface Platform {
  /** Sends messages to an entity, or to a child by the ID that `start` gave. Rejects for an unknown child. */
  to: <W>(Class: WorkflowClass<W>, id: string) => Messages<W>;
  /** Reads the state of an entity or of a child. A read leaves no trace in the journal. */
  read: <W>(Class: WorkflowClass<W>, id: string) => Promise<State<W>>;
  /** Reads the state of the children of one class that an entity started, in the order of their start. */
  children: <W>(
    Class: WorkflowClass<W>,
    entityId: string
  ) => Promise<State<W>[]>;
}

/** What the runtime gives an instance. Lifecycle code never uses it. */
export interface Host<Input, Outside> {
  id: string;
  input: Input;
  outside: Outside;
  until: (condition: () => boolean, timeout?: number) => Promise<boolean>;
  start: <ChildInput, W extends Workflow<ChildInput, unknown, Outside>>(
    Class: new (host: Host<ChildInput, Outside>) => W,
    input: ChildInput
  ) => Child<W>;
}
