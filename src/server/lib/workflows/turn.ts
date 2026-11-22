import { setImmediate } from "node:timers/promises";

import type { Clock } from "@server/lib/clock/clock";
import type { Transaction } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import { encode, install } from "./codec";
import { write } from "./projection";
import { create } from "./runtime";
import type {
  Call,
  Instance,
  Message,
  Session,
  WorkflowClass,
} from "./runtime";
import type {
  Json,
  JsonObject,
  ResolveStep,
  RunStep,
  Step,
  Value,
} from "./storage.types";
import { insertRoot, load, loadResult, lockRoot, save } from "./store";
import type { Target } from "./store";
import type { Workflow } from "./workflow";

export interface Context {
  readonly tx: Transaction;
  readonly clock: Clock;
  readonly workflows: Record<string, WorkflowClass>;
  readonly calls: Call[];
}

export type Input =
  | { kind: "call"; method: string; args: Value[]; start?: Json[] }
  | { kind: "wake" };

type Resolution = Pick<ResolveStep, "command" | "of" | "outcome">;

export async function turn(
  context: Context,
  target: Target,
  input: Input
): Promise<Value> {
  const start = input.kind === "call" ? input.start : undefined;
  const { now, state } = await lock(context, target, start);

  if (state === "absent") {
    if (input.kind === "wake") {
      return undefined;
    }

    throw notFound("WORKFLOW_NOT_FOUND");
  }

  const session: Session = {
    tx: context.tx,
    now,
    woken: input.kind === "wake" ? target.id : undefined,
    workflows: context.workflows,
    instances: new Map(),
    queue: [],
    calls: context.calls,
  };

  const instance =
    state === "created"
      ? await createRoot(session, target, start!)
      : await revive(session, target.id);

  const reply =
    input.kind === "call"
      ? call(instance.workflow, input.method, input.args)
      : undefined;

  await drain(session);
  await project(session);
  await persist(session);

  return reply;
}

async function lock({ tx, clock }: Context, target: Target, start?: Json[]) {
  const locked = await lockRoot(tx, target);
  const now = clock.now.getTime();

  if (locked || !start) {
    return { now, state: locked ? "existing" : "absent" };
  }

  if (await insertRoot(tx, target, now)) {
    return { now, state: "created" };
  }

  return { now, state: (await lockRoot(tx, target)) ? "existing" : "absent" };
}

async function createRoot(session: Session, target: Target, args: Json[]) {
  const instance = create(
    session,
    { ...target, rootId: target.id, parentId: null, createdAt: session.now },
    null
  );

  session.instances.set(target.id, instance);
  await startRun(instance, args);

  return instance;
}

async function revive(session: Session, id: string) {
  const row = await load(session.tx, id);

  const instance = create(
    session,
    {
      id,
      type: row.type,
      rootId: row.rootId,
      parentId: row.parentId,
      createdAt: row.createdAt.getTime(),
    },
    row.result
  );

  session.instances.set(id, instance);

  if (row.result === null) {
    await replay(instance, row.journal);
  }

  install(instance, row.fields);
  instance.now = session.now;
  instance.before = instance.workflow.rows();

  return instance;
}

async function touch(session: Session, id: string) {
  return session.instances.get(id) ?? (await revive(session, id));
}

async function replay(instance: Instance, journal: Step[]) {
  instance.replaying = true;
  instance.journal = journal;

  for (const step of journal) {
    if (step.kind === "run") {
      await begin(instance, step);
    } else if (step.kind === "resolve") {
      await resolve(instance, step);
    }
  }

  instance.replaying = false;
}

async function startRun(instance: Instance, args: Json[]) {
  const step: RunStep = {
    kind: "run",
    args,
    fields: encode(instance),
    at: instance.session.now,
  };

  instance.journal.push(step);
  await begin(instance, step);
}

async function begin(instance: Instance, step: RunStep) {
  install(instance, step.fields);
  instance.now = step.at;
  instance.args = step.args;
  instance.next = 0;
  instance.run = instance.workflow.run(...structuredClone(step.args));
  await advance(instance);
}

async function resume(instance: Instance, resolution: Resolution) {
  const step: ResolveStep = {
    kind: "resolve",
    ...resolution,
    fields: encode(instance),
    at: instance.session.now,
  };

  instance.journal.push(step);
  await resolve(instance, step);
}

async function resolve(instance: Instance, step: ResolveStep) {
  const command = instance.pending;

  if (
    command?.of === "restart" ||
    command?.of !== step.of ||
    command.number !== step.command
  ) {
    throw new Error(
      `The journal of the workflow ${instance.type} ${instance.id} does not match its run()`
    );
  }

  install(instance, step.fields);
  instance.now = step.at;
  instance.pending = undefined;
  command.resolve(step.outcome);
  await advance(instance);
}

async function advance(instance: Instance) {
  const result = await Promise.race([instance.run!, setImmediate()]);

  if (result) {
    await finish(instance, result);
  } else if (instance.pending?.of === "restart") {
    instance.journal = [];
    instance.pending = undefined;
    await startRun(instance, instance.args);
  } else if (instance.pending) {
    install(instance, encode(instance));
  } else {
    throw new Error(
      `run() of the workflow ${instance.type} ${instance.id} awaits a promise that the engine did not give`
    );
  }
}

async function finish(instance: Instance, result: JsonObject) {
  instance.result = result;
  instance.journal = [];

  if (instance.parentId) {
    await touch(instance.session, instance.parentId);
  }
}

async function drain(session: Session) {
  for (;;) {
    const message = session.queue.shift();

    if (message) {
      await deliver(session, message);
    } else {
      const next = await ready(session);

      if (!next) {
        return;
      }

      await resume(next.instance, next.resolution);
    }
  }
}

async function deliver(session: Session, message: Message) {
  const instance = await touch(session, message.to);

  if (message.kind === "run") {
    await startRun(instance, message.args);
  } else {
    call(instance.workflow, message.method, message.args);
  }
}

async function ready(session: Session) {
  for (const instance of ordered(session)) {
    const resolution = await resolutionOf(session, instance);

    if (resolution) {
      return { instance, resolution };
    }
  }
}

async function resolutionOf(
  session: Session,
  { id, pending }: Instance
): Promise<Resolution | undefined> {
  if (pending?.of === "until") {
    if (pending.condition()) {
      return { command: pending.number, of: "until", outcome: true };
    }

    if (
      session.woken === id &&
      pending.deadline &&
      pending.deadline() < session.now
    ) {
      return { command: pending.number, of: "until", outcome: false };
    }
  }

  if (pending?.of === "result") {
    const child = session.instances.get(pending.child);

    const result = child
      ? child.result
      : await loadResult(session.tx, pending.child);

    if (result) {
      return { command: pending.number, of: "result", outcome: result };
    }
  }
}

const isHandler = (value: unknown): value is (...args: Value[]) => Value =>
  typeof value === "function";

function call(workflow: Workflow<unknown>, method: string, args: Value[]) {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(workflow),
    method
  )?.value;

  if (!isHandler(handler)) {
    throw new Error(`The workflow has no handler ${method}`);
  }

  return handler.apply(workflow, args);
}

async function project(session: Session) {
  for (const instance of ordered(session)) {
    await write(session.tx, instance.before, instance.workflow.rows());
  }
}

async function persist(session: Session) {
  for (const instance of ordered(session)) {
    await save(session.tx, instance);
  }
}

const ordered = (session: Session) =>
  [...session.instances.values()].toSorted(
    (a, b) =>
      Number(b.id === b.rootId) - Number(a.id === a.rootId) ||
      a.id.localeCompare(b.id)
  );
