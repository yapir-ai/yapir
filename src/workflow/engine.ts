import type { Activity } from "./activity";
import type { Database, Transaction } from "./database.types";
import { handle } from "./handle";
import { typeOf } from "./runtime";
import type { Call, WorkflowClass } from "./runtime";
import type { Json, Value } from "./storage.types";
import { deleteTree, due } from "./store";
import { turn } from "./turn";
import type { Clock, Context } from "./turn";
import type { Workflow } from "./workflow";
import type { Updates } from "./workflow.types";

interface Unit<Tx extends Transaction = Transaction> {
  tx: Tx;
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

export function workflowEngine<Tx extends Transaction>({
  db,
  clock,
  executionContext,
  workflows,
  activities,
}: {
  db: Database<Tx>;
  clock: Clock;
  executionContext: { waitUntil: (promise: Promise<void>) => void };
  workflows: Record<string, WorkflowClass>;
  activities: Activity[];
}) {
  async function within<T>(work: (context: Context, tx: Tx) => Promise<T>) {
    const calls: Call[] = [];

    const result = await db.transaction(
      async (tx) => await work({ tx, clock, workflows, calls }, tx)
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

  function unit(context: Context, tx: Tx): Unit<Tx> {
    const open = async (work: (context: Context) => Promise<Value>) =>
      await work(context);

    return {
      tx,
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
    transaction: async <T>(work: (unit: Unit<Tx>) => Promise<T>) =>
      await within(async (context, tx) => await work(unit(context, tx))),
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

export type WorkflowEngine<Tx extends Transaction = Transaction> = ReturnType<
  typeof workflowEngine<Tx>
>;
