import type { Transaction } from "@server/lib/db";
import { v7 as uuidv7 } from "uuid";

import type { Activity } from "./activity";
import { handle } from "./handle";
import type { Extra, Send } from "./handle";
import type { Row } from "./projection";
import type { Json, JsonObject, Step, Value } from "./storage.types";
import type { Workflow } from "./workflow";
import type { Child } from "./workflow.types";

export type WorkflowClass = new () => Workflow<unknown>;

export type Call = (activities: readonly Activity[]) => Promise<void>;

export type Message =
  | { kind: "run"; to: string; args: Json[] }
  | { kind: "signal"; to: string; method: string; args: Value[] };

export type Command =
  | {
      of: "until";
      number: number;
      condition: () => boolean;
      deadline?: () => number;
      resolve: (outcome: Json) => void;
    }
  | {
      of: "result";
      number: number;
      child: string;
      resolve: (outcome: Json) => void;
    }
  | { of: "restart" };

export interface Session {
  readonly tx: Transaction;
  readonly now: number;
  readonly woken?: string;
  readonly workflows: Record<string, WorkflowClass>;
  readonly instances: Map<string, Instance>;
  readonly queue: Message[];
  readonly calls: Call[];
}

export interface Identity {
  readonly id: string;
  readonly type: string;
  readonly rootId: string;
  readonly parentId: string | null;
  readonly createdAt: number;
}

export interface Runtime extends Identity {
  readonly session: Session;
  now: number;
  replaying: boolean;
  journal: Step[];
  next: number;
  pending?: Command;
  args: Json[];
  run?: Promise<JsonObject>;
  result: JsonObject | null;
  before: Row[];
}

export interface Instance extends Runtime {
  readonly workflow: Workflow<unknown>;
}

let constructed: Runtime | undefined;

export function typeOf(
  workflows: Record<string, WorkflowClass>,
  workflow: WorkflowClass
) {
  const [type] = Object.entries(workflows).find(
    ([, candidate]) => candidate === workflow
  )!;

  return type;
}

export const journalMismatch = ({ type, id }: Identity) =>
  new Error(
    `The journal of the workflow ${type} ${id} does not match its run()`
  );

export function constructing() {
  return constructed!;
}

export function create(
  session: Session,
  identity: Identity,
  result: JsonObject | null
): Instance {
  const runtime: Runtime = {
    ...identity,
    session,
    now: session.now,
    replaying: false,
    journal: [],
    next: 0,
    args: [],
    result,
    before: [],
  };

  constructed = runtime;
  const workflow = new session.workflows[identity.type]!();
  constructed = undefined;

  return Object.assign(runtime, { workflow });
}

function issue(runtime: Runtime, command: Command) {
  if (runtime.pending) {
    throw new Error(
      `run() of the workflow ${runtime.type} ${runtime.id} waits for one engine promise at a time`
    );
  }

  runtime.pending = command;
}

function nextCommand(runtime: Runtime) {
  const number = runtime.next;
  runtime.next += 1;

  return number;
}

export async function until(
  runtime: Runtime,
  condition: () => boolean,
  deadline?: () => number
) {
  const { promise, resolve } = Promise.withResolvers<boolean>();

  issue(runtime, {
    of: "until",
    number: nextCommand(runtime),
    condition,
    deadline,
    resolve: (outcome) => resolve(outcome === true),
  });

  return await promise;
}

async function childResult(runtime: Runtime, child: string) {
  const { promise, resolve } = Promise.withResolvers<Json>();
  issue(runtime, {
    of: "result",
    number: nextCommand(runtime),
    child,
    resolve,
  });

  return await promise;
}

export async function continueAsNew(runtime: Runtime) {
  issue(runtime, { of: "restart" });

  return await Promise.withResolvers<never>().promise;
}

export function start<W extends Workflow<unknown>>(
  runtime: Runtime,
  workflow: new () => W,
  args: Json[]
): Child<W> {
  const command = nextCommand(runtime);

  const child = runtime.replaying
    ? replayedChild(runtime, command)
    : spawn(runtime, workflow, command, args);

  return handle(...childParts(runtime, child));
}

function replayedChild(runtime: Runtime, command: number) {
  const step = runtime.journal.find(
    (each) => each.kind === "start" && each.command === command
  );

  if (step?.kind !== "start") {
    throw journalMismatch(runtime);
  }

  return step.child;
}

function spawn(
  runtime: Runtime,
  workflow: WorkflowClass,
  command: number,
  args: Json[]
) {
  const { session } = runtime;
  const id = uuidv7();

  runtime.journal.push({ kind: "start", command, child: id });

  session.instances.set(
    id,
    create(
      session,
      {
        id,
        type: typeOf(session.workflows, workflow),
        rootId: runtime.rootId,
        parentId: runtime.id,
        createdAt: session.now,
      },
      null
    )
  );

  session.queue.push({ kind: "run", to: id, args });

  return id;
}

export function childParts(owner: Runtime, id: string): [Send, Extra] {
  return [
    (method, args) => signal(owner, id, method, args),
    {
      id,
      get result() {
        return childResult(owner, id);
      },
    },
  ];
}

export function parentParts(runtime: Runtime): [Send, Extra] {
  const id = runtime.parentId!;

  return [(method, args) => signal(runtime, id, method, args), { id }];
}

function signal(
  runtime: Runtime,
  to: string,
  method: string,
  args: Value[]
): undefined {
  if (!runtime.replaying) {
    runtime.session.queue.push({ kind: "signal", to, method, args });
  }
}

export function record(runtime: Runtime, call: Call) {
  if (!runtime.replaying) {
    runtime.session.calls.push(call);
  }
}
