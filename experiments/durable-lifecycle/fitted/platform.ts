// The platform fitted to the Yapir lifecycle. An author writes two kinds of
// class and calls them through `Platform`.
//
// The one rule: a public method of an Entity or a Workflow is a handler. The
// handlers of one entity and of its workflows run one at a time. What a handler
// changes commits when it returns. A handler that throws changes nothing.

// Durable state is plain data: what JSON keeps.
export type Durable<T> = unknown extends T
  ? T
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends (...args: never[]) => unknown
      ? never
      : { [K in keyof T]: Durable<T[K]> };

// The durable queue of an entity. It keeps each event ID once, forever.
export interface Inbox<Event extends { id: string }> {
  // Makes the event wait. False when the inbox already received this ID.
  add(event: Event): boolean;
  // Hands over the waiting events, in the order of their reception.
  deliver(): Event[];
  // The delivered events are done.
  acknowledge(): void;
  // The delivered events wait again, at their place in the order of reception.
  giveBack(): void;
}

// The place of one kind of workflow in an entity: one is live at most.
export interface Slot<W> {
  readonly live: W | undefined;
  // Throws when one is live.
  start(): W;
}

// How long a workflow can stay without a call, and what happens then. The time
// starts again when the workflow starts and after each call to it.
export interface Deadline {
  after: number;
  expire: () => unknown;
}

// What `end` returns. A handler returns it when its call ended the workflow.
export class Ended {
  protected readonly brand = "ended";
}

// The calls outside the platform. A handler awaits the reads, which can run
// more than once. The effects run after the commit, at least once.
export interface Outside {
  reads: object;
  effects: object;
}

type Arguments<Call> = Call extends (...args: infer A) => unknown ? A : never;

// The thing that lives for weeks: a state, an inbox, and its workflows. Its
// first call creates it.
export abstract class Entity<Event extends { id: string }, State> {
  readonly #turn: EntityTurn<Event>;

  constructor(turn: EntityTurn<Event>) {
    this.#turn = turn;
  }

  // The only data that the platform keeps between two handlers.
  abstract state: Durable<State>;

  // The read model. The platform stores it at each commit, to list and filter.
  abstract view(): unknown;

  get id() {
    return this.#turn.id;
  }

  get inbox() {
    return this.#turn.inbox;
  }

  // Declares a slot. `ended` runs in the handler that ends the workflow.
  protected child<W extends AnyWorkflow>(
    type: WorkflowClass<W>,
    ended: (end: EndOf<W>) => void
  ) {
    return this.#turn.child(type, ended);
  }
}

// A piece of work of an entity that ends once, with an `End`. After the end, no
// handler runs: each call gets the end.
export abstract class Workflow<
  Parent extends AnyEntity,
  State,
  End,
  Out extends Outside,
> {
  readonly #turn: WorkflowTurn<Pick<Parent, "id" | "inbox">, End, Out>;

  constructor(turn: WorkflowTurn<Pick<Parent, "id" | "inbox">, End, Out>) {
    this.#turn = turn;
  }

  abstract state: Durable<State>;

  get id() {
    return this.#turn.id;
  }

  get parent() {
    return this.#turn.parent;
  }

  protected get read() {
    return this.#turn.reads;
  }

  // Runs once, in the handler that starts the workflow.
  protected started(): void {}

  protected deadline(): Deadline | undefined {
    return undefined;
  }

  // Calls `effects[name]` after the commit. A rejection calls the handler
  // `rejected` with the message of the error.
  protected effect<
    Name extends keyof Out["effects"],
    Rejected extends string = never,
  >(
    this: Workflow<Parent, State, End, Out> &
      Record<NoInfer<Rejected>, (error: string) => unknown>,
    name: Name,
    args: Arguments<Out["effects"][Name]>,
    options?: { rejected: Rejected }
  ) {
    this.#turn.effect(name, args, options?.rejected);
  }

  protected end(end: End) {
    return this.#turn.end(end);
  }
}

export type AnyEntity = Entity<{ id: string }, unknown>;

export type AnyWorkflow = Workflow<AnyEntity, unknown, unknown, Outside>;

export type EntityClass<E> = new (turn: never) => E;

export type WorkflowClass<W> = new (turn: never) => W;

export type EndOf<W> =
  W extends Workflow<AnyEntity, unknown, infer End, Outside> ? End : never;

// The answer of a handler, or the end of the workflow: the call ended it, or
// found it ended.
export type Reply<End, Answer> =
  | { ended: End }
  | ([Exclude<Answer, Ended>] extends [never]
      ? never
      : { answer: Exclude<Answer, Ended> });

type Handlers<T, Base> = {
  [
    K in keyof T as K extends keyof Base
      ? never
      : T[K] extends (...args: never[]) => unknown
        ? K
        : never
  ]: T[K];
};

type Answer<Handler> = Handler extends (...args: never[]) => infer A
  ? Awaited<A>
  : never;

export type EntityRef<E> = {
  [K in keyof Handlers<E, AnyEntity>]: (
    ...args: Arguments<Handlers<E, AnyEntity>[K]>
  ) => Promise<Answer<Handlers<E, AnyEntity>[K]>>;
};

export type WorkflowRef<W> = {
  [K in keyof Handlers<W, AnyWorkflow>]: (
    ...args: Arguments<Handlers<W, AnyWorkflow>[K]>
  ) => Promise<Reply<EndOf<W>, Answer<Handlers<W, AnyWorkflow>[K]>>>;
};

// What the routes use.
export interface Platform {
  entity<E extends AnyEntity>(type: EntityClass<E>, id: string): EntityRef<E>;
  // An unknown ID rejects.
  workflow<W extends AnyWorkflow>(
    type: WorkflowClass<W>,
    id: string
  ): WorkflowRef<W>;
  view<E extends AnyEntity>(
    type: EntityClass<E>,
    id: string
  ): Promise<ReturnType<E["view"]>>;
  // Each workflow of that type that the entity started, live or ended, in the
  // order of their start.
  history<W extends AnyWorkflow>(
    type: WorkflowClass<W>,
    entityId: string
  ): Promise<{ id: string; state: W["state"]; ended?: EndOf<W> }[]>;
}

// What a runtime gives to the classes. An author does not use it.
export interface EntityTurn<Event extends { id: string }> {
  id: string;
  inbox: Inbox<Event>;
  child<W extends AnyWorkflow>(
    type: WorkflowClass<W>,
    ended: (end: EndOf<W>) => void
  ): Slot<W>;
}

export interface WorkflowTurn<Parent, End, Out extends Outside> {
  id: string;
  parent: Parent;
  reads: Out["reads"];
  effect(name: PropertyKey, args: unknown[], rejected?: string): void;
  end(end: End): Ended;
}
