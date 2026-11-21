/** A class that the platform keeps, as `ask`, `read`, `list` and `start` name it. */
export type Class<T> = new (...args: never[]) => T;

/** The handlers of an entity or a workflow: its public synchronous methods. */
export type HandlerName<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => Promise<unknown>
    ? never
    : T[K] extends (...args: never[]) => unknown
      ? K
      : never;
}[keyof T];

/** Messages to the handlers, without their answers. */
export type Messages<T> = {
  [K in HandlerName<T>]: T[K] extends (...args: infer A) => unknown
    ? (...args: A) => void
    : never;
};

type ErrorHandlerName<T> = {
  [K in HandlerName<T>]: T[K] extends (...args: infer A) => unknown
    ? [string] extends A
      ? K
      : never
    : never;
}[HandlerName<T>];

/** Calls to the outside world. Each runs at least once, after the handler commits. */
export type OutsideCalls<Outside, T> = {
  [K in keyof Outside]: Outside[K] extends (
    ...args: infer A
  ) => Promise<unknown>
    ? (...args: A) => { onError: (handler: ErrorHandlerName<T>) => void }
    : never;
};

declare const endedBrand: unique symbol;

/** What `end` returns. A handler returns it when it ended its workflow. */
export interface Ended {
  readonly [endedBrand]: true;
}

/** The answer of a workflow handler, or the end of the workflow: the call ended it, or found it ended. */
export type Reply<End, Answer> =
  | { ended: End }
  | ([Exclude<Answer, Ended>] extends [never]
      ? never
      : { answer: Exclude<Answer, Ended> });

export type EndOf<T> =
  T extends WorkflowBase<infer _Self, infer _Parent, infer End, infer _Outside>
    ? End
    : never;

type Answer<T, R> = [EndOf<T>] extends [never] ? R : Reply<EndOf<T>, R>;

/** Requests from outside the platform: the handlers, with their answers. */
export type Requests<T> = {
  [K in HandlerName<T>]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Answer<T, R>>
    : never;
};

/** The committed state, with the `End` of an ended workflow. */
export type Committed<T> = Readonly<T> &
  ([EndOf<T>] extends [never] ? unknown : { readonly ended?: EndOf<T> });

abstract class Durable<Self, Outside> {
  constructor() {
    if (constructing) {
      bindings.set(this, constructing);
    }
  }

  /** The id of this entity or workflow. */
  get id(): string {
    return bindingOf(this).id;
  }

  /** Calls a handler of this one after `ms`. It replaces the pending timer of the same handler. */
  protected after(ms: number): Messages<Self> {
    return bindingOf(this).after(ms);
  }

  /** Calls the outside world. `onError` gives the error message of a rejection to a handler of this one. */
  protected get outside(): OutsideCalls<Outside, Self> {
    return bindingOf(this).outside();
  }
}

abstract class EntityBase<Self, Outside> extends Durable<Self, Outside> {
  /** Starts a workflow of this entity from its constructor arguments, and returns it live. */
  protected start<A extends unknown[], W extends { readonly parent: Self }>(
    workflow: new (...args: A) => W,
    ...args: A
  ): W {
    return bindingOf(this).start(workflow, args);
  }
}

abstract class WorkflowBase<Self, Parent, End, Outside> extends Durable<
  Self,
  Outside
> {
  /** The entity that started this workflow. Both share one turn and one commit. */
  get parent(): Parent {
    return bindingOf(this).parent();
  }

  /** Ends this workflow, once. After it, the platform runs none of its handlers. */
  protected end(end: End): Ended {
    return bindingOf(this).end(end);
  }
}

/**
 * The base classes for one set of outside calls. Fields are the state, public methods are the handlers.
 * The platform runs one handler of an entity or of its workflows at a time, synchronously, and commits
 * the entity, its workflows and what the handler scheduled and called together. A handler that throws
 * commits nothing.
 */
export function durable<Outside>() {
  abstract class Entity<Self> extends EntityBase<Self, Outside> {}
  abstract class Workflow<Self, Parent, End> extends WorkflowBase<
    Self,
    Parent,
    End,
    Outside
  > {}

  return { Entity, Workflow };
}

/** The platform as routes and tests reach it. */
export interface Platform {
  /** Runs a handler. An entity without constructor arguments exists for every id. An unknown workflow id rejects. */
  ask: <T>(type: Class<T>, id: string) => Requests<T>;
  read: <T>(type: Class<T>, id: string) => Promise<Committed<T>>;
  /** The workflows of one class that an entity started, in the order of their start. */
  list: <E, W extends { readonly parent: E }>(
    entity: Class<E>,
    id: string,
    workflow: Class<W>
  ) => Promise<Committed<W>[]>;
}

// The runtime binds each instance to its storage. Lifecycle code never uses this part.
export interface Binding {
  id: string;
  after: <T>(ms: number) => Messages<T>;
  outside: <Outside, T>() => OutsideCalls<Outside, T>;
  start: <A extends unknown[], W>(
    workflow: new (...args: A) => W,
    args: A
  ) => W;
  parent: <P>() => P;
  end: (end: unknown) => Ended;
}

const bindings = new WeakMap<object, Binding>();
let constructing: Binding | undefined;

export function bind<T extends object>(binding: Binding, make: () => T): T {
  const previous = constructing;
  constructing = binding;

  try {
    const instance = make();
    bindings.set(instance, binding);

    return instance;
  } finally {
    constructing = previous;
  }
}

function bindingOf(instance: object) {
  const binding = bindings.get(instance);

  if (!binding) {
    throw new Error("Only the platform creates entities and workflows");
  }

  return binding;
}
