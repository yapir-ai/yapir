import { engine, inject, project } from "./engine";
import type { Updates } from "./engine";
import { Execution } from "./execution";
import { dispatchOperation } from "./operations";
import { taskTable } from "./schema";
import { Task } from "./task";

declare const activityOfAnotherOperation: (
  executionId: number
) => Promise<void>;

export const taskHandlers: Record<keyof Updates<Task>, true> = {
  receive: true,
  stop: true,
  executionClaimed: true,
};

export const executionHandlers: Record<keyof Updates<Execution>, true> = {
  claim: true,
  pull: true,
  endTurn: true,
  fail: true,
  stop: true,
  deliver: true,
};

export async function misuse() {
  // @ts-expect-error -- a handler argument of the wrong type
  await engine.get(Task, "task").stop(42);

  // @ts-expect-error -- only its task starts an execution
  engine.start(Execution, "execution", []);

  // @ts-expect-error -- `run` of the task takes no argument
  engine.start(Task, "task", "argument");

  // @ts-expect-error -- an activity argument of the wrong type
  await inject(dispatchOperation)(42);

  // @ts-expect-error -- the activity does not match its operation
  engine.register(dispatchOperation, activityOfAnotherOperation);

  // @ts-expect-error -- a column that the table does not have
  project(taskTable, { id: "task", state: "idle", failures: 0 });

  // @ts-expect-error -- a value outside the column type
  project(taskTable, { id: "task", state: "done", consecutiveFailures: 0 });
}
