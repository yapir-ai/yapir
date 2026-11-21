import { Entity } from "./platform";
import type { Host, Messages, Platform, State } from "./platform";

// A throwaway runtime, in memory, with a virtual time. `storage` is durable.
// A restart loses every instance: the next input builds them again from a
// snapshot of their fields and a replay of the journal written since.

type Fields = Record<string, unknown>;

type Instance = Fields & { id: string; run: () => Promise<unknown> };

// oxlint-disable-next-line typescript/no-explicit-any
type Class = new (host: Host<any, any>) => object;

type Ref<W> = abstract new (host: never) => W;

// The journal: the messages that came in, and the answers to the operations
// that the classes started, which are the outside calls and the timers.
type Input =
  | { type: "message"; target: string; method: string; args: unknown[] }
  | { type: "answer"; seq: number; name: string; ok: boolean; value: unknown };

type Entry = Input & { at: number };

interface Stored {
  className: string;
  since: number;
  fields?: Fields;
  children: { id: string; className: string; input: unknown; fields: Fields }[];
  journal: Entry[];
}

interface Operation {
  name: string;
  args: unknown[];
  due?: number;
  started?: true;
  settle: (ok: boolean, value: unknown) => void;
}

interface Waiter {
  condition: () => boolean;
  resolve: (inTime: boolean) => void;
  timer?: number;
}

const noop = () => {};

const tick = async () =>
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const handles = new WeakSet<object>();

const isHandle = (value: unknown) =>
  typeof value === "object" && value !== null && handles.has(value);

function view(instance: Instance) {
  const state: Fields = { id: instance.id };

  const fields = Object.entries(instance).filter(
    ([, value]) => !isHandle(value)
  );

  const getters = Object.getOwnPropertyDescriptors(
    Object.getPrototypeOf(instance)
  );

  for (const [name, { get }] of Object.entries(getters)) {
    if (get) {
      state[name] = instance[name];
    }
  }

  return structuredClone({ ...state, ...Object.fromEntries(fields) });
}

class Live {
  readonly id: string;
  readonly children = new Map<string, Instance>();
  readonly operations = new Map<number, Operation>();
  private readonly runtime: Runtime;
  private readonly stored: Stored;
  private readonly inputs = new Map<string, unknown>();
  private readonly waiters = new Set<Waiter>();
  private root!: Instance;
  private now: number;
  private seq = 0;
  private running = 0;
  private returned = false;
  private failure: unknown;
  private replaying = true;

  constructor(runtime: Runtime, id: string, stored: Stored) {
    this.runtime = runtime;
    this.id = id;
    this.stored = stored;
    this.now = stored.since;
  }

  async recover() {
    const { className, fields, children, journal } = this.stored;
    this.root = this.create(className, this.id, undefined);
    Object.assign(this.root, structuredClone(fields));

    for (const saved of structuredClone(children)) {
      const child = this.create(saved.className, saved.id, saved.input);
      Object.assign(child, saved.fields);
    }

    this.cycle();
    await this.settle();

    for (const entry of journal) {
      this.now = entry.at;
      this.apply(entry);
      await this.settle();
    }

    this.replaying = false;
    this.flush();
  }

  find(id: string) {
    const instance = id === this.id ? this.root : this.children.get(id);

    if (!instance) {
      throw new Error(`Unknown workflow ${id}`);
    }

    return instance;
  }

  record(input: Input) {
    this.now = this.runtime.storage.now;
    const entry = structuredClone({ ...input, at: this.now });
    this.stored.journal.push(entry);

    return this.apply(entry);
  }

  // Runs the classes until nothing can move without a new journal entry.
  async settle() {
    do {
      await tick();

      if (this.failure) {
        throw this.failure;
      }
    } while (this.wake() || this.rest());

    if (!this.replaying) {
      this.flush();
    }
  }

  private create(className: string, id: string, input: unknown) {
    const Class = this.runtime.classes.get(className)!;

    const host: Host<unknown, unknown> = {
      id,
      input: structuredClone(input),
      outside: new Proxy({}, { get: (_, name: string) => this.ask(name) }),
      until: async (condition, timeout) => await this.until(condition, timeout),
      start: (Child, childInput) => this.start(Child, childInput) as never,
    };

    const instance = new Class(host) as Instance;
    this.inputs.set(id, input);

    if (id !== this.id) {
      this.children.set(id, instance);
    }

    return instance;
  }

  private cycle() {
    this.returned = false;
    this.root.run().then(
      () => {
        this.returned = true;
      },
      (error: unknown) => {
        this.failure = error;
      }
    );
  }

  private apply(entry: Entry) {
    if (entry.type === "message") {
      const target = this.find(entry.target);
      const method = target[entry.method] as (...args: unknown[]) => unknown;

      const answer = new Promise((resolve) => {
        resolve(method.apply(target, structuredClone(entry.args)));
      });

      answer.catch(noop);

      return answer;
    }

    const operation = this.operations.get(entry.seq);

    if (operation?.name !== entry.name) {
      throw new Error(
        `The replay diverged: the journal answers ${entry.name}, the code called ${operation?.name ?? "nothing"}`
      );
    }

    this.operations.delete(entry.seq);
    operation.settle(entry.ok, structuredClone(entry.value));
  }

  private wake() {
    const ready = [...this.waiters].filter(({ condition }) => condition());

    for (const waiter of ready) {
      this.waiters.delete(waiter);
      this.operations.delete(waiter.timer ?? 0);
      waiter.resolve(true);
    }

    return ready.length > 0;
  }

  // The end of a cycle: `run()` returned and nothing else moves, so the fields alone say where the entity is.
  private rest() {
    const moving = this.running + this.operations.size + this.waiters.size;

    if (!this.returned || moving > 0) {
      return false;
    }

    if (!this.replaying) {
      // A field that still holds a child cannot be cloned: the save fails loudly.
      this.stored.fields = structuredClone({ ...this.root });
      this.stored.children = [...this.children].map(([id, child]) => ({
        id,
        className: child.constructor.name,
        input: this.inputs.get(id),
        fields: structuredClone({ ...child }),
      }));
      this.stored.since = this.now;
      this.stored.journal = [];
      this.seq = 0;
    }

    this.cycle();

    return true;
  }

  // Starts the outside calls that have no answer yet. After a restart, that runs them again: at least once each.
  private flush() {
    for (const [seq, operation] of this.operations) {
      if (operation.due === undefined && !operation.started) {
        operation.started = true;
        const { name, args } = operation;

        const answer = (ok: boolean) => async (value: unknown) =>
          await this.runtime.step(this, {
            type: "answer",
            seq,
            name,
            ok,
            value: ok ? value : (value as Error).message,
          });

        new Promise((resolve) => {
          resolve(this.runtime.outside[name]!(...args));
        }).then(answer(true), answer(false));
      }
    }
  }

  private operate(operation: Operation) {
    this.seq += 1;
    this.operations.set(this.seq, operation);

    return this.seq;
  }

  private async until(condition: () => boolean, timeout?: number) {
    if (condition()) {
      return true;
    }

    const { promise, resolve } = Promise.withResolvers<boolean>();
    const waiter: Waiter = { condition, resolve };
    this.waiters.add(waiter);

    if (timeout !== undefined) {
      waiter.timer = this.operate({
        name: "timer",
        args: [],
        due: this.now + timeout,
        settle: () => {
          this.waiters.delete(waiter);
          resolve(false);
        },
      });
    }

    return await promise;
  }

  private ask(name: string) {
    return async (...args: unknown[]) => {
      const { promise, resolve, reject } = Promise.withResolvers<unknown>();
      promise.catch(noop);
      this.operate({
        name,
        args: structuredClone(args),
        settle: (ok, value) => {
          if (ok) {
            resolve(value);
          } else {
            reject(new Error(String(value)));
          }
        },
      });

      return await promise;
    };
  }

  private start(Class: Class, input: unknown) {
    const id = `${this.id}/${this.children.size + 1}`;
    const child = this.create(Class.name, id, input);
    this.running += 1;

    const result = child.run().finally(() => {
      this.running -= 1;
    });

    result.catch(noop);

    const handle = new Proxy(child, {
      get(target, name) {
        const value: unknown =
          name === "result" ? result : Reflect.get(target, name, target);

        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    handles.add(handle);

    return handle;
  }
}

export class Runtime<Outside extends object = object> implements Platform {
  readonly storage = { now: 0, entities: new Map<string, Stored>() };
  readonly outside: Record<string, (...args: unknown[]) => unknown>;
  readonly classes: Map<string, Class>;
  private lives = new Map<string, Live>();
  private tail: Promise<unknown> = Promise.resolve();
  private jobs = 0;

  constructor(options: {
    outside: Outside;
    // oxlint-disable-next-line typescript/no-explicit-any
    workflows: (new (host: Host<any, Outside>) => object)[];
  }) {
    this.outside = options.outside as Runtime["outside"];
    this.classes = new Map(
      options.workflows.map((Class) => [Class.name, Class])
    );
  }

  to<W>(Class: Ref<W>, id: string) {
    const send =
      (_: object, method: string) =>
      async (...args: unknown[]) =>
        await this.send(Class as never, id, method, args);

    return new Proxy({}, { get: send }) as Messages<W>;
  }

  async read<W>(Class: Ref<W>, id: string) {
    const live = await this.enqueue(
      async () => await this.load(Class as never, id)
    );

    return view(live.find(id)) as State<W>;
  }

  async children<W>(Class: Ref<W>, entityId: string) {
    const live = await this.enqueue(
      async () => await this.loadEntity(entityId)
    );

    return [...live.children.values()]
      .filter((child) => child instanceof Class)
      .map((child) => view(child) as State<W>);
  }

  /** Moves the virtual time forward, and fires each timer at its time. */
  async advance(ms: number) {
    const end = this.storage.now + ms;
    await this.enqueue(async () => {
      for (const id of this.storage.entities.keys()) {
        await this.loadEntity(id);
      }
    });

    for (;;) {
      await this.idle();

      const [timer] = [...this.lives.values()]
        .flatMap((live) =>
          [...live.operations].map(([seq, { due = Infinity }]) => ({
            live,
            seq,
            due,
          }))
        )
        .filter(({ due }) => due <= end)
        .toSorted((a, b) => a.due - b.due);

      if (!timer) {
        break;
      }

      this.storage.now = timer.due;
      await this.step(timer.live, {
        type: "answer",
        seq: timer.seq,
        name: "timer",
        ok: true,
        value: false,
      });
    }

    this.storage.now = end;
  }

  /** The process dies: every instance is lost. */
  async restart() {
    await this.idle();
    this.lives = new Map();
  }

  async step(live: Live, input: Input) {
    return await this.enqueue(async () => {
      // An answer for an instance that a restart lost: the new instance calls again.
      if (this.lives.get(live.id) === live) {
        live.record(input);
        await live.settle();
      }
    });
  }

  private async send(
    Class: Class,
    id: string,
    method: string,
    args: unknown[]
  ) {
    const { answer } = await this.enqueue(async () => {
      const live = await this.load(Class, id);
      live.find(id);

      const pending = live.record({
        type: "message",
        target: id,
        method,
        args,
      });

      await live.settle();

      return { answer: pending };
    });

    try {
      return structuredClone(await answer);
    } finally {
      await this.idle();
    }
  }

  private async load(Class: Class, id: string) {
    return Class.prototype instanceof Entity
      ? await this.loadEntity(id, Class)
      : await this.loadEntity(id.slice(0, Math.max(0, id.lastIndexOf("/"))));
  }

  private async loadEntity(id: string, Class?: Class) {
    const alive = this.lives.get(id);

    if (alive) {
      return alive;
    }

    if (!this.storage.entities.has(id)) {
      if (!Class) {
        throw new Error(`Unknown workflow ${id}`);
      }

      this.storage.entities.set(id, {
        className: Class.name,
        since: this.storage.now,
        children: [],
        journal: [],
      });
    }

    const live = new Live(this, id, this.storage.entities.get(id)!);
    await live.recover();
    this.lives.set(id, live);

    return live;
  }

  // One job at a time, for every entity: the order of the jobs is the order of the journal.
  private async enqueue<Value>(job: () => Promise<Value>) {
    this.jobs += 1;
    const done = this.tail.then(job);
    this.tail = done.catch(noop);

    return await done;
  }

  // Quiescent: nothing moves until the time moves, an input arrives or an outside call answers.
  private async idle() {
    let jobs: number;

    do {
      ({ jobs } = this);
      await this.tail;
      await tick();
    } while (jobs !== this.jobs);
  }
}
