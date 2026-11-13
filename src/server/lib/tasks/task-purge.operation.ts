import type { Db } from "@server/lib/db";
import { taskTable } from "@server/lib/db/schema";
import { and, lt, notInArray } from "drizzle-orm";
import type { Files } from "files-sdk";

import { taskSessionKey } from "./task-session.dto";
import { activeTaskStates } from "./task.dto";

export function taskPurgeOperation({ db, files }: { db: Db; files: Files }) {
  async function execute(cutoff: Date) {
    const tasks = await db
      .delete(taskTable)
      .where(
        and(
          lt(taskTable.stateChangedAt, cutoff),
          notInArray(taskTable.state, activeTaskStates)
        )
      )
      .returning({ id: taskTable.id });

    const { errors } = await files.delete(
      tasks.map((task) => taskSessionKey(task.id))
    );

    if (errors) {
      throw new AggregateError(errors, "Task sessions deletion failed");
    }
  }

  return { execute };
}

export type TaskPurgeOperation = ReturnType<typeof taskPurgeOperation>;
