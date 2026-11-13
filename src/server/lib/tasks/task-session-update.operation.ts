import type { ExecutionSelect } from "@server/lib/db/schema";
import type { Files } from "files-sdk";

import { taskSessionKey } from "./task-session.dto";
import type { TaskSessionUpdateRequestDto } from "./task-session.dto";

export function taskSessionUpdateOperation({ files }: { files: Files }) {
  async function execute(
    { taskId }: ExecutionSelect,
    session: TaskSessionUpdateRequestDto
  ) {
    await files.upload(taskSessionKey(taskId), JSON.stringify(session));
  }

  return { execute };
}
