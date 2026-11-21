/** A class of entities, as `send`, `create`, `ask` and `read` name it. */
export type EntityClass<E> = new (...args: never[]) => E;

/** The handlers of an entity: its public synchronous methods. */
export type HandlerName<E> = {
  [K in keyof E]: E[K] extends (...args: never[]) => Promise<unknown>
    ? never
    : E[K] extends (...args: never[]) => unknown
      ? K
      : never;
}[keyof E];

/** Messages to an entity: its handlers, without their answers. */
export type Messages<E> = {
  [K in HandlerName<E>]: E[K] extends (...args: infer A) => unknown
    ? (...args: A) => void
    : never;
};

/** Requests to an entity from outside the platform: its handlers, with their answers. */
export type Requests<E> = {
  [K in HandlerName<E>]: E[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never;
};

type ErrorHandlerName<E> = {
  [K in HandlerName<E>]: E[K] extends (error: string) => unknown ? K : never;
}[HandlerName<E>];

/** Calls to the outside world. Each runs at least once, after the handler commits. */
export type OutsideCalls<Outside, E> = {
  [K in keyof Outside]: Outside[K] extends (
    ...args: infer A
  ) => Promise<unknown>
    ? (...args: A) => { onError: (handler: ErrorHandlerName<E>) => void }
    : never;
};

/**
 * A durable entity, which names its own class as `Self`. Its fields are its state, its public methods are its handlers.
 * The platform runs one handler of an entity at a time, synchronously, and commits
 * the fields together with what the handler sent, scheduled and called. A handler
 * that throws commits nothing.
 */
export abstract class Entity<Self, Outside> {
  constructor() {
    if (constructing) {
      bindings.set(this, constructing);
    }
  }

  /** The id of this entity. */
  get id(): string {
    return bindingOf(this).id;
  }

  /** Sends a message to an entity. */
  protected send<E>(entity: EntityClass<E>, id: string): Messages<E> {
    return bindingOf(this).send(entity, id);
  }

  /** Sends a message to this entity after `ms`. It replaces the pending timer of the same handler. */
  protected after(ms: number): Messages<Self> {
    return bindingOf(this).after(ms);
  }

  /** Creates an entity from its constructor arguments, and returns its id. */
  protected create<A extends unknown[], E>(
    entity: new (...args: A) => E,
    ...args: A
  ): string {
    return bindingOf(this).create(entity, args);
  }

  /** Calls the outside world. `onError` sends the error message of a rejection to a handler of this entity. */
  protected get outside(): OutsideCalls<Outside, Self> {
    return bindingOf(this).outside();
  }
}

/** The platform as routes and tests reach it. */
export interface Platform {
  /** Runs a handler of an entity and returns its answer. An entity without constructor arguments exists for every id. */
  ask: <E>(entity: EntityClass<E>, id: string) => Requests<E>;
  /** Reads the committed state of an entity. */
  read: <E>(entity: EntityClass<E>, id: string) => Promise<Readonly<E>>;
}

// The runtime binds each entity to its storage. Lifecycle code never uses this part.
export interface Binding {
  id: string;
  send: <E>(entity: EntityClass<E>, id: string) => Messages<E>;
  after: <E>(ms: number) => Messages<E>;
  create: (entity: EntityClass<unknown>, args: unknown[]) => string;
  outside: <Outside, E>() => OutsideCalls<Outside, E>;
}

const bindings = new WeakMap<object, Binding>();
let constructing: Binding | undefined;

export function bind<E extends object>(binding: Binding, make: () => E): E {
  const previous = constructing;
  constructing = binding;

  try {
    const entity = make();
    bindings.set(entity, binding);

    return entity;
  } finally {
    constructing = previous;
  }
}

function bindingOf(entity: object) {
  const binding = bindings.get(entity);

  if (!binding) {
    throw new Error("Only the platform creates entities");
  }

  return binding;
}
