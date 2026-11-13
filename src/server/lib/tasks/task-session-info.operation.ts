import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";
import type { Files } from "files-sdk";

import { TaskSessionUpdateRequest, taskSessionKey } from "./task-session.dto";
import type { TaskSessionInfoParamsDto } from "./task-session.dto";

export function taskSessionInfoOperation({
  db,
  currentUser,
  files,
}: {
  db: Db;
  currentUser: CurrentUser;
  files: Files;
}) {
  async function execute({ taskId }: TaskSessionInfoParamsDto) {
    const task = await db.query.taskTable.findFirst({
      columns: {},
      with: { automation: { columns: { projectId: true } } },
      where: { id: taskId },
    });

    if (
      !task ||
      !(await currentUser.hasProjectAccess("read", task.automation.projectId))
    ) {
      throw notFound("TASK_NOT_FOUND");
    }

    const key = taskSessionKey(taskId);

    if (!(await files.exists(key))) {
      throw notFound("TASK_SESSION_NOT_FOUND");
    }

    const session = await files.download(key);

    return TaskSessionUpdateRequest.parse(JSON.parse(await session.text()));
  }

  return { execute };
}
