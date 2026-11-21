import { Ended } from "./platform";
import type {
  AnyEntity,
  AnyWorkflow,
  Deadline,
  EntityClass,
  Inbox,
  Outside,
  Platform,
  Slot,
  WorkflowClass,
} from "./platform";

// Throwaway. Durable storage is the `Storage` object. A runtime keeps only the
// turn queues and the effects in flight, and a restart loses both.

type Json = unknown;

type Handlers = Record<string, (...args: Json[]) => unknown>;

type EntityType = EntityClass<AnyEntity>;

type WorkflowType = WorkflowClass<AnyWorkflow>;

type At = "waiting" | "delivered" | "done";

interface EntityRecord {
  state?: Json;
  view?: Json;
  inbox: { event: { id: string }; at: At }[];
}

interface WorkflowRecord {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  state?: Json;
  ended?: Json;
  deadlineAt?: number;
}

interface EffectRecord {
  id: string;
  workflowId: string;
  name: string;
  args: Json[];
  rejected?: string;
}

interface Storage {
  now: number;
  entities: Record<string, EntityRecord>;
  workflows: Record<string, WorkflowRecord>;
  outbox: Record<string, EffectRecord>;
}

type Loaded = ReturnType<Runtime["load"]>;

type LoadedWorkflow = AnyWorkflow & {
  state: Json;
  started: () => void;
  deadline: () => Deadline | undefined;
};

const durable = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));

const settled = async () =>
  await new Promise((resolve) => setImmediate(resolve));

const ended = new Ended();
const newId = () => crypto.randomUUID();

class Runtime {
  alive = true;
  storage: Storage;
  entities: Map<string, EntityType>;
  outside: Outside;
  queues = new Map<string, Promise<unknown>>();

  constructor(storage: Storage, entities: EntityType[], outside: Outside) {
    this.storage = storage;
    this.entities = new Map(entities.map((type) => [type.name, type]));
    this.outside = outside;

    for (const effect of Object.values(storage.outbox)) {
      this.runEffect(effect);
    }
  }

  // The entity and its workflows, as copies that `commit` writes back.
  load(type: EntityType, id: string) {
    const { storage, outside } = this;
    const key = `${type.name}:${id}`;
    const record = durable(storage.entities[key]) ?? { inbox: [] };

    const workflows = durable(
      Object.values(storage.workflows).filter(
        (workflow) =>
          workflow.entityType === type.name && workflow.entityId === id
      )
    );

    const slots = new Map<
      string,
      { type: WorkflowType; ended: (end: Json) => void }
    >();

    const instances = new Map<string, LoadedWorkflow>();
    const effects: EffectRecord[] = [];
    // The workflows whose deadline starts again at the commit.
    const called = new Set<string>();

    function move(from: At, to: At) {
      const moved = record.inbox.filter((row) => row.at === from);

      for (const row of moved) {
        row.at = to;
      }

      return moved.map((row) => row.event);
    }

    const inbox: Inbox<{ id: string }> = {
      add(event) {
        const isNew = record.inbox.every((row) => row.event.id !== event.id);

        if (isNew) {
          record.inbox.push({ event, at: "waiting" });
        }

        return isNew;
      },
      deliver: () => move("waiting", "delivered"),
      acknowledge: () => void move("delivered", "done"),
      giveBack: () => void move("delivered", "waiting"),
    };

    function instance(workflow: WorkflowRecord) {
      const slot = slots.get(workflow.type)!;
      const { id: workflowId } = workflow;

      const created = new slot.type({
        id: workflowId,
        parent: entity,
        reads: outside.reads,
        effect: (name: string, args: Json[], rejected?: string) =>
          effects.push({ id: newId(), workflowId, name, args, rejected }),
        end(end: Json) {
          workflow.ended = end;
          slot.ended(end);

          return ended;
        },
      } as never) as LoadedWorkflow;

      created.state = workflow.state ?? created.state;
      instances.set(workflowId, created);

      return created;
    }

    function live(property: "id" | "type", value: string) {
      const workflow = workflows.find(
        (candidate) =>
          candidate[property] === value && candidate.ended === undefined
      );

      return workflow && (instances.get(workflow.id) ?? instance(workflow));
    }

    const entity = new type({
      id,
      inbox,
      child(workflowType: WorkflowType, onEnded: (end: Json) => void) {
        slots.set(workflowType.name, { type: workflowType, ended: onEnded });

        const slot: Slot<AnyWorkflow> = {
          get live() {
            return live("type", workflowType.name);
          },
          start() {
            if (slot.live) {
              throw new Error(`A ${workflowType.name} is live`);
            }

            const workflow: WorkflowRecord = {
              id: newId(),
              type: workflowType.name,
              entityType: type.name,
              entityId: id,
            };

            workflows.push(workflow);
            called.add(workflow.id);
            const started = instance(workflow);
            started.started();

            return started;
          },
        };

        return slot;
      },
    } as never) as AnyEntity & { state: Json };

    entity.state = record.state ?? entity.state;

    return {
      entity,
      called,
      live: (workflowId: string) => live("id", workflowId),
      record: (workflowId: string) =>
        workflows.find((workflow) => workflow.id === workflowId)!,
      commit: () => {
        record.state = entity.state;
        record.view = entity.view();
        storage.entities[key] = durable(record);

        for (const workflow of workflows) {
          const loaded = instances.get(workflow.id);
          workflow.state = loaded ? loaded.state : workflow.state;

          if (workflow.ended !== undefined) {
            delete workflow.deadlineAt;
          } else if (loaded && called.has(workflow.id)) {
            const deadline = loaded.deadline();
            workflow.deadlineAt = deadline && storage.now + deadline.after;
          }

          storage.workflows[workflow.id] = durable(workflow);
        }

        for (const effect of effects) {
          storage.outbox[effect.id] = durable(effect);
          this.runEffect(effect);
        }
      },
    };
  }

  // One turn at a time for each entity. A turn that throws commits nothing.
  async turn<Answer>(
    type: EntityType,
    id: string,
    run: (loaded: Loaded) => Answer | Promise<Answer>
  ) {
    const key = `${type.name}:${id}`;
    const previous = this.queues.get(key) ?? Promise.resolve();

    const result = previous.then(async () => {
      const loaded = this.load(type, id);
      const answer = await run(loaded);

      if (!this.alive) {
        throw new Error("The platform restarted during the turn");
      }

      loaded.commit();

      return answer;
    });

    this.queues.set(
      key,
      result.catch(() => {})
    );

    return await result;
  }

  async workflowTurn<Answer>(
    workflowId: string,
    run: (target: LoadedWorkflow | undefined, loaded: Loaded) => Answer
  ) {
    const workflow = this.storage.workflows[workflowId];

    if (!workflow) {
      throw new Error("WORKFLOW_UNKNOWN");
    }

    return await this.turn(
      this.entities.get(workflow.entityType)!,
      workflow.entityId,
      (loaded) => run(loaded.live(workflowId), loaded)
    );
  }

  async call(workflowId: string, method: string, args: Json[]) {
    return await this.workflowTurn(workflowId, async (target, loaded) => {
      if (!target) {
        return { ended: loaded.record(workflowId).ended };
      }

      const answer = await (target as never as Handlers)[method]!(...args);
      loaded.called.add(workflowId);
      const end = loaded.record(workflowId).ended;

      return end === undefined ? { answer } : { ended: end };
    });
  }

  async expire(workflowId: string) {
    const { storage } = this;

    await this.workflowTurn(workflowId, (target, loaded) => {
      const { deadlineAt } = loaded.record(workflowId);

      if (target && deadlineAt !== undefined && deadlineAt <= storage.now) {
        loaded.called.add(workflowId);
        target.deadline()?.expire();
      }
    });
  }

  runEffect(effect: EffectRecord) {
    const effects = this.outside.effects as Handlers;

    void (async () => {
      const rejection = await Promise.resolve()
        .then(() => effects[effect.name]!(...effect.args))
        .then(
          () => {},
          (error: Error) => error.message
        );

      if (!this.alive) {
        return;
      }

      if (rejection !== undefined && effect.rejected) {
        await this.call(effect.workflowId, effect.rejected, [rejection]);
      }

      delete this.storage.outbox[effect.id];
    })();
  }
}

const handlers = (call: (method: string, args: Json[]) => Promise<unknown>) =>
  new Proxy(
    {},
    {
      get:
        (_, method: string) =>
        async (...args: Json[]) =>
          await call(method, args).finally(settled),
    }
  );

// The test kit. Each call resolves when the platform is quiescent.
export function testPlatform({
  entities,
  outside,
}: {
  entities: EntityType[];
  outside: Outside;
}) {
  const storage: Storage = { now: 0, entities: {}, workflows: {}, outbox: {} };
  let runtime = new Runtime(storage, entities, outside);

  const platform = {
    entity: (type: EntityType, id: string) =>
      handlers(
        async (method, args) =>
          await runtime.turn(type, id, ({ entity }) =>
            (entity as never as Handlers)[method]!(...args)
          )
      ),
    workflow: (_type: WorkflowType, id: string) =>
      handlers(async (method, args) => await runtime.call(id, method, args)),
    async view(type: EntityType, id: string) {
      return (
        storage.entities[`${type.name}:${id}`]?.view ??
        runtime.load(type, id).entity.view()
      );
    },
    async history(type: WorkflowType, entityId: string) {
      return Object.values(storage.workflows)
        .filter((row) => row.type === type.name && row.entityId === entityId)
        .map(({ id, state, ended }) => ({ id, state, ended }));
    },
  } as Platform;

  return {
    platform,
    // Moves the virtual time and fires the deadlines that come due, in order.
    async advance(ms: number) {
      const end = storage.now + ms;

      for (;;) {
        const [due] = Object.values(storage.workflows)
          .filter(({ deadlineAt }) => deadlineAt !== undefined)
          .toSorted((a, b) => a.deadlineAt! - b.deadlineAt!);

        if (!due || due.deadlineAt! > end) {
          break;
        }

        storage.now = Math.max(storage.now, due.deadlineAt!);
        await runtime.expire(due.id);
        await settled();
      }

      storage.now = end;
    },
    // The process dies: the effects that did not settle run again.
    async restart() {
      runtime.alive = false;
      runtime = new Runtime(storage, entities, outside);
      await settled();
    },
  };
}
