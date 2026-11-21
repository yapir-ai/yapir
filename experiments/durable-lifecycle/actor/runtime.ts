import { bind } from "./platform";
import type { Binding, EntityClass, Platform } from "./platform";

// A throwaway in-memory runtime. `storage` is the only state that survives a restart.

interface Ref {
  entity: string;
  id: string;
}

interface Message {
  to: Ref;
  handler: string;
  args: unknown[];
}

interface Timer extends Message {
  at: number;
}

interface Call {
  id: string;
  from: Ref;
  name: string;
  args: unknown[];
  onError?: string;
}

interface Storage {
  now: number;
  snapshots: Record<string, unknown>;
  mailbox: Message[];
  timers: Timer[];
  calls: Call[];
}

interface Transaction {
  touched: Map<string, object>;
  mailbox: Message[];
  timers: Timer[];
  calls: Call[];
}

type Handlers = Record<string, (...args: unknown[]) => unknown>;

type OutsideFunctions = Record<
  string,
  (...args: unknown[]) => Promise<unknown>
>;

const settled = async () =>
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const keyOf = (ref: Ref) => `${ref.entity}/${ref.id}`;

const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function handlerProxy(
  target: (handler: string, args: unknown[]) => unknown
): never {
  return new Proxy(
    {},
    {
      get: (_, handler) =>
        handler === "then"
          ? undefined
          : (...args: unknown[]) => target(String(handler), args),
    }
  ) as never;
}

export function createRuntime<Outside>(options: {
  entities: Record<string, EntityClass<object>>;
  outside: Outside;
}) {
  const storage: Storage = {
    now: 0,
    snapshots: {},
    mailbox: [],
    timers: [],
    calls: [],
  };

  let instances = new Map<string, object>();
  let started = new Set<string>();
  let generation = 0;
  let transaction: Transaction | undefined;
  let drainScheduled = false;

  function nameOf(entity: EntityClass<unknown>) {
    const found = Object.entries(options.entities).find(
      ([, registered]) => registered === entity
    );

    if (!found) {
      throw new Error(`${entity.name} is not a registered entity`);
    }

    return found[0];
  }

  function current() {
    if (!transaction) {
      throw new Error("An entity acts only inside its handlers");
    }

    return transaction;
  }

  function binding(ref: Ref): Binding {
    return {
      id: ref.id,
      send: (entity, id) =>
        handlerProxy((handler, args) => {
          current().mailbox.push({
            to: { entity: nameOf(entity), id },
            handler,
            args: structuredClone(args),
          });
        }),
      after: (ms) =>
        handlerProxy((handler, args) => {
          current().timers.push({
            to: ref,
            handler,
            args: structuredClone(args),
            at: storage.now + ms,
          });
        }),
      create(entity, args) {
        const created = { entity: nameOf(entity), id: crypto.randomUUID() };
        const Class = entity as unknown as new (...args: unknown[]) => object;

        const instance = bind(
          binding(created),
          () => new Class(...structuredClone(args))
        );

        current().touched.set(keyOf(created), instance);

        return created.id;
      },
      outside: () =>
        handlerProxy((name, args) => {
          const call: Call = {
            id: crypto.randomUUID(),
            from: ref,
            name,
            args: structuredClone(args),
          };

          current().calls.push(call);

          return {
            onError(handler: string) {
              call.onError = handler;
            },
          };
        }),
    };
  }

  function load(ref: Ref) {
    const key = keyOf(ref);
    const cached = instances.get(key);

    if (cached) {
      return cached;
    }

    const Class = options.entities[ref.entity]!;
    const snapshot = storage.snapshots[key];

    if (snapshot) {
      const rebuilt = bind(binding(ref), () =>
        Object.assign(Object.create(Class.prototype) as object, json(snapshot))
      );

      instances.set(key, rebuilt);

      return rebuilt;
    }

    if (Class.length > 0) {
      throw new Error(`Unknown ${ref.entity} ${ref.id}`);
    }

    const New = Class as unknown as new () => object;

    return bind(binding(ref), () => new New());
  }

  function run(
    ref: Ref,
    handler: string,
    args: unknown[],
    consume?: () => void
  ) {
    const tx: Transaction = {
      touched: new Map(),
      mailbox: [],
      timers: [],
      calls: [],
    };

    transaction = tx;

    try {
      const instance = load(ref) as Handlers;
      tx.touched.set(keyOf(ref), instance);
      const method = instance[handler];

      if (typeof method !== "function") {
        throw new TypeError(`${ref.entity} has no handler ${handler}`);
      }

      const answer = method.apply(instance, args);

      if (answer instanceof Promise) {
        throw new TypeError(`${ref.entity}.${handler} must be synchronous`);
      }

      commit(tx, consume);

      return answer;
    } catch (error) {
      for (const key of tx.touched.keys()) {
        instances.delete(key);
      }

      consume?.();
      throw error;
    } finally {
      transaction = undefined;
    }
  }

  function commit(tx: Transaction, consume?: () => void) {
    for (const [key, instance] of tx.touched) {
      storage.snapshots[key] = json(instance);
      instances.set(key, instance);
    }

    storage.mailbox.push(...tx.mailbox);

    for (const timer of tx.timers) {
      storage.timers = storage.timers.filter(
        (pending) =>
          keyOf(pending.to) !== keyOf(timer.to) ||
          pending.handler !== timer.handler
      );
      storage.timers.push(timer);
    }

    storage.calls.push(...tx.calls);
    consume?.();
    startCalls();
    scheduleDrain();
  }

  function removeCall(call: Call) {
    storage.calls = storage.calls.filter(({ id }) => id !== call.id);
  }

  function startCalls() {
    const outside = options.outside as OutsideFunctions;

    for (const call of storage.calls) {
      if (started.has(call.id)) {
        continue;
      }

      started.add(call.id);
      const startedIn = generation;

      void Promise.resolve()
        .then(async () => await outside[call.name]!(...call.args))
        .then(
          () => {
            if (startedIn === generation) {
              removeCall(call);
            }
          },
          (error: Error) => {
            // Without an error handler, the call stays in storage and runs again at the next start.
            if (startedIn !== generation || !call.onError) {
              return;
            }

            removeCall(call);
            storage.mailbox.push({
              to: call.from,
              handler: call.onError,
              args: [error.message],
            });
            scheduleDrain();
          }
        );
    }
  }

  function scheduleDrain() {
    if (drainScheduled) {
      return;
    }

    drainScheduled = true;
    queueMicrotask(drain);
  }

  function drain() {
    drainScheduled = false;

    while (storage.mailbox.length > 0) {
      const message = storage.mailbox[0]!;
      run(message.to, message.handler, message.args, () => {
        storage.mailbox.splice(storage.mailbox.indexOf(message), 1);
      });
    }
  }

  const platform: Platform = {
    ask: (entity, id) =>
      handlerProxy(async (handler, args) => {
        const answer = run(
          { entity: nameOf(entity), id },
          handler,
          structuredClone(args)
        );

        await settled();

        return answer;
      }),
    read: async (entity, id) => load({ entity: nameOf(entity), id }) as never,
  };

  return {
    ...platform,

    // Moves the virtual time forward and fires the timers that come due, in order.
    async advance(ms: number) {
      const end = storage.now + ms;

      for (;;) {
        const due = storage.timers
          .filter(({ at }) => at <= end)
          .sort((a, b) => a.at - b.at)[0];

        if (!due) {
          break;
        }

        storage.now = due.at;
        run(due.to, due.handler, due.args, () => {
          storage.timers = storage.timers.filter((timer) => timer !== due);
        });
        await settled();
      }

      storage.now = end;
    },

    // Loses every instance and in-flight call, then resumes from storage.
    async restart() {
      await settled();
      instances = new Map();
      started = new Set();
      generation += 1;
      startCalls();
      scheduleDrain();
      await settled();
    },
  };
}

export type Runtime = ReturnType<typeof createRuntime>;
