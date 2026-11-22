import type { Clock } from "@server/lib/clock/clock";
import type { Db, Transaction } from "@server/lib/db";

import type { Activity } from "./activity";
import { handle } from "./handle";
import { typeOf } from "./runtime";
import type { Call, WorkflowClass } from "./runtime";
import type { Json, Value } from "./storage.types";
import { deleteTree, due } from "./store";
import { turn } from "./turn";
import type { Context } from "./turn";
import type { Workflow } from "./workflow";
import type { Updates } from "./workflow.types";

export interface Unit {
  tx: Transaction;
  get: <W extends Workflow<unknown>>(
    workflow: new () => W,
    id: string
  ) => Updates<W>;
  start: <W extends Workflow>(
    workflow: new () => W,
    id: string,
    ...args: Parameters<W["run"]>
  ) => Updates<W>;
  delete: (workflow: WorkflowClass, id: string) => Promise<void>;
}

export function workflowEngine({
  db,
  clock,
  executionContext,
  workflows,
  activities,
}: {
  db: Db;
  clock: Clock;
  executionContext: Pick<ExecutionContext, "waitUntil">;
  workflows: Record<string, WorkflowClass>;
  activities: Activity[];
}) {
  async function within<T>(work: (context: Context) => Promise<T>) {
    const calls: Call[] = [];

    const result = await db.transaction(
      async (tx) => await work({ tx, clock, workflows, calls })
    );

    for (const call of calls) {
      executionContext.waitUntil(call(activities));
    }

    return result;
  }

  function updates<W extends Workflow<unknown>>(
    workflow: new () => W,
    id: string,
    open: (work: (context: Context) => Promise<Value>) => Promise<Value>,
    start?: Json[]
  ): Updates<W> {
    return handle(
      async (method, args) =>
        await open(
          async (context) =>
            await turn(
              context,
              { type: typeOf(workflows, workflow), id },
              { kind: "call", method, args, start }
            )
        )
    );
  }

  function unit(context: Context): Unit {
    const open = async (work: (context: Context) => Promise<Value>) =>
      await work(context);

    return {
      tx: context.tx,
      get: (workflow, id) => updates(workflow, id, open),
      start: (workflow, id, ...args) => updates(workflow, id, open, args),
      delete: async (workflow, id) =>
        await deleteTree(context.tx, { type: typeOf(workflows, workflow), id }),
    };
  }

  return {
    get: <W extends Workflow<unknown>>(workflow: new () => W, id: string) =>
      updates(workflow, id, within),
    start: <W extends Workflow>(
      workflow: new () => W,
      id: string,
      ...args: Parameters<W["run"]>
    ) => updates(workflow, id, within, args),
    transaction: async <T>(work: (unit: Unit) => Promise<T>) =>
      await within(async (context) => await work(unit(context))),
    async sweep() {
      const targets = await due(db, clock.now, Object.keys(workflows));

      await Promise.all(
        targets.map(
          async (target) =>
            await within(
              async (context) => await turn(context, target, { kind: "wake" })
            )
        )
      );
    },
  };
}

export type WorkflowEngine = ReturnType<typeof workflowEngine>;
