import { bind } from "./platform";
import type { Binding, Class, Ended, Platform } from "./platform";

// A throwaway in-memory runtime. `storage` is the only state that survives a restart.

// An entity and its workflows form one domain: one turn at a time, one commit.
interface Target {
  entity: string;
  id: string;
  workflow?: string;
}

interface Message {
  to: Target;
  handler: string;
  args: unknown[];
}

interface Timer extends Message {
  at: number;
}

interface Call {
  id: string;
  from: Target;
  name: string;
  args: unknown[];
  onError?: string;
}

interface StoredDomain {
  state: string;
  workflows: Record<string, { class: string; state: string; ended?: unknown }>;
}

interface Storage {
  now: number;
  domains: Record<string, StoredDomain>;
  workflowDomains: Record<string, Target>;
  mailbox: Message[];
  timers: Timer[];
  calls: Call[];
}

interface Domain {
  entity: object;
  workflows: Map<string, Instance>;
}

type Instance = object & { ended?: unknown };

type Transaction = Pick<Storage, "timers" | "calls">;

type Handlers = Record<string, (...args: unknown[]) => unknown>;

type OutsideFunctions = Record<
  string,
  (...args: unknown[]) => Promise<unknown>
>;

const settled = async () =>
  await new Promise((resolve) => setImmediate(resolve));

const keyOf = ({ entity, id }: Target) => `${entity}/${id}`;

const ended = {} as Ended;

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

// The `End` sits on the instance, out of its serialized fields.
function markEnded(instance: Instance, end: unknown) {
  Object.defineProperty(instance, "ended", { value: end });
}

export function createRuntime<Outside>(options: {
  entities: Record<string, Class<object>>;
  workflows: Record<string, Class<object>>;
  outside: Outside;
}) {
  const classes = { ...options.entities, ...options.workflows };

  const storage: Storage = {
    now: 0,
    domains: {},
    workflowDomains: {},
    mailbox: [],
    timers: [],
    calls: [],
  };

  let domains = new Map<string, Domain>();
  let started = new Set<string>();
  let generation = 0;
  let transaction: Transaction | undefined;
  let drainScheduled = false;
  const workflowIds = new WeakMap<object, string>();

  const names = new Map<unknown, string>(
    Object.entries(classes).map(([name, type]) => [type, name])
  );

  const nameOf = (type: unknown) => names.get(type)!;

  function current() {
    if (!transaction) {
      throw new Error("An entity acts only inside its handlers");
    }

    return transaction;
  }

  function binding(domain: Domain, target: Target): Binding {
    return {
      id: target.workflow ?? target.id,
      after: (ms) =>
        handlerProxy((handler, args) => {
          current().timers.push({
            to: target,
            handler,
            args: structuredClone(args),
            at: storage.now + ms,
          });
        }),
      outside: () =>
        handlerProxy((name, args) => {
          const call: Call = {
            id: crypto.randomUUID(),
            from: target,
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
      start(type, args) {
        const workflow = crypto.randomUUID();

        const instance = bind(
          binding(domain, { ...target, workflow }),
          () => new type(...structuredClone(args)) as object
        );

        workflowIds.set(instance, workflow);
        domain.workflows.set(workflow, instance);

        return instance as never;
      },
      parent: () => domain.entity as never,
      end(end) {
        markEnded(
          domain.workflows.get(target.workflow!)!,
          structuredClone(end)
        );

        return ended;
      },
    };
  }

  function serialize(instance: object) {
    return JSON.stringify(instance, (key, value: unknown) =>
      key !== "" && workflowIds.has(value as object)
        ? { $workflow: workflowIds.get(value as object) }
        : value
    );
  }

  function loadDomain(entity: string, id: string): Domain {
    const key = keyOf({ entity, id });
    const cached = domains.get(key);

    if (cached) {
      return cached;
    }

    const Class = classes[entity]!;
    const stored = storage.domains[key];
    const domain: Domain = { entity: {}, workflows: new Map() };
    const root = { entity, id };

    if (!stored) {
      if (Class.length > 0) {
        throw new Error(`Unknown ${entity} ${id}`);
      }

      const New = Class as unknown as new () => object;
      domain.entity = bind(binding(domain, root), () => new New());

      return domain;
    }

    for (const [workflow, { class: name, ended: end }] of Object.entries(
      stored.workflows
    )) {
      const instance: Instance = bind(
        binding(domain, { ...root, workflow }),
        () => Object.create(classes[name]!.prototype) as object
      );

      workflowIds.set(instance, workflow);

      if (end !== undefined) {
        markEnded(instance, end);
      }

      domain.workflows.set(workflow, instance);
    }

    const revive = (state: string) =>
      JSON.parse(state, (_, value: { $workflow?: string } | null) =>
        typeof value?.$workflow === "string"
          ? domain.workflows.get(value.$workflow)
          : value
      ) as object;

    for (const [workflow, instance] of domain.workflows) {
      Object.assign(instance, revive(stored.workflows[workflow]!.state));
    }

    domain.entity = bind(binding(domain, root), () =>
      Object.assign(
        Object.create(Class.prototype) as object,
        revive(stored.state)
      )
    );
    domains.set(key, domain);

    return domain;
  }

  function run(
    target: Target,
    handler: string,
    args: unknown[],
    consume?: () => void
  ) {
    transaction = { timers: [], calls: [] };

    try {
      const domain = loadDomain(target.entity, target.id);

      const workflow =
        target.workflow === undefined
          ? undefined
          : domain.workflows.get(target.workflow)!;

      let answer: unknown;

      if (workflow?.ended === undefined) {
        answer = ((workflow ?? domain.entity) as Handlers)[handler]!(...args);

        if (answer instanceof Promise) {
          throw new TypeError(`${handler} must be synchronous`);
        }

        commit(target, domain, transaction);
        startCalls();
        scheduleDrain();
      }

      if (!workflow) {
        return answer;
      }

      return workflow.ended === undefined
        ? { answer }
        : { ended: workflow.ended };
    } catch (error) {
      domains.delete(keyOf(target));
      throw error;
    } finally {
      consume?.();
      transaction = undefined;
    }
  }

  function commit(target: Target, domain: Domain, tx: Transaction) {
    const root = { entity: target.entity, id: target.id };
    const workflows: StoredDomain["workflows"] = {};

    for (const [id, instance] of domain.workflows) {
      workflows[id] = {
        class: nameOf(instance.constructor),
        state: serialize(instance),
        ended: instance.ended,
      };
      storage.workflowDomains[id] = root;
    }

    storage.domains[keyOf(root)] = {
      state: serialize(domain.entity),
      workflows,
    };
    domains.set(keyOf(root), domain);

    for (const timer of tx.timers) {
      storage.timers = storage.timers.filter(
        (pending) =>
          keyOf(pending.to) !== keyOf(timer.to) ||
          pending.to.workflow !== timer.to.workflow ||
          pending.handler !== timer.handler
      );
      storage.timers.push(timer);
    }

    storage.calls.push(...tx.calls);
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

  function targetOf(type: unknown, id: string): Target {
    const name = nameOf(type);

    if (!(name in options.workflows)) {
      return { entity: name, id };
    }

    const root = storage.workflowDomains[id];

    if (!root) {
      throw new Error(`Unknown ${name} ${id}`);
    }

    return { ...root, workflow: id };
  }

  const platform: Platform = {
    ask: (type, id) =>
      handlerProxy(async (handler, args) => {
        const answer = run(targetOf(type, id), handler, structuredClone(args));
        await settled();

        return answer;
      }),
    async read(type, id) {
      const target = targetOf(type, id);
      const domain = loadDomain(target.entity, target.id);

      return (
        target.workflow === undefined
          ? domain.entity
          : domain.workflows.get(target.workflow)
      ) as never;
    },
    async list(entity, id, workflow) {
      const domain = loadDomain(nameOf(entity), id);

      return [...domain.workflows.values()].filter(
        (instance) => instance instanceof workflow
      ) as never;
    },
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
      domains = new Map();
      started = new Set();
      generation += 1;
      startCalls();
      scheduleDrain();
      await settled();
    },
  };
}
