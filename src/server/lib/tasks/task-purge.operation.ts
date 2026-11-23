import type { Db, Transaction } from "@server/lib/db";
import { taskTable } from "@server/lib/db/schema";
import type { WorkflowEngine } from "@workflow";
import { and, eq, lt, notInArray } from "drizzle-orm";
import type { Files } from "files-sdk";

import { taskSessionKey } from "./task-session.dto";
import { activeTaskStates } from "./task.dto";
import { Task } from "./task.workflow";

export function taskPurgeOperation({
  db,
  files,
  workflowEngine,
}: {
  db: Db;
  files: Files;
  workflowEngine: WorkflowEngine<Transaction>;
}) {
  async function purge(taskId: string, cutoff: Date) {
    return await workflowEngine.transaction(
      async ({ tx, get, delete: remove }) => {
        const [task] = await tx
          .select({ id: taskTable.id })
          .from(taskTable)
          .where(eq(taskTable.id, taskId))
          .for("update");

        if (!task || !(await get(Task, taskId).purgeable(cutoff.getTime()))) {
          return [];
        }

        await remove(Task, taskId);
        await tx.delete(taskTable).where(eq(taskTable.id, taskId));

        return [taskId];
      }
    );
  }

  async function execute(cutoff: Date) {
    const candidates = await db
      .select({ id: taskTable.id })
      .from(taskTable)
      .where(
        and(
          lt(taskTable.stateChangedAt, cutoff),
          notInArray(taskTable.state, activeTaskStates)
        )
      );

    const purged = await Promise.all(
      candidates.map(async ({ id }) => await purge(id, cutoff))
    );

    const { errors } = await files.delete(purged.flat().map(taskSessionKey));

    if (errors) {
      throw new AggregateError(errors, "Task sessions deletion failed");
    }
  }

  return { execute };
}

export type TaskPurgeOperation = ReturnType<typeof taskPurgeOperation>;
