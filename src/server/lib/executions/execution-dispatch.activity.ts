import type { Db } from "@server/lib/db";
import type { ApiEnv } from "@server/lib/env";

import type { Dispatchers } from "./dispatcher";
import type { DispatcherName } from "./dispatcher.dto";
import { deriveClaimId } from "./execution-secret";

export function executionDispatchActivity({
  db,
  env,
  dispatchers,
}: {
  db: Db;
  env: ApiEnv;
  dispatchers: Promise<Dispatchers>;
}) {
  async function execute(
    executionId: string,
    taskId: string,
    dispatcher: DispatcherName
  ) {
    const task = await db.query.taskTable.findFirst({
      columns: {},
      with: {
        automation: {
          columns: {},
          with: { ciRepository: { columns: { path: true } } },
        },
      },
      where: { id: taskId },
    });

    await (await dispatchers).get(dispatcher)?.dispatch({
      dispatcher,
      ciRepository: task!.automation.ciRepository,
      payload: {
        executionId,
        claimId: deriveClaimId(executionId, env),
        cacheKey: taskId,
        serverUrl: env.SERVER_URL,
        image: env.RUNNER_IMAGE,
      },
    });
  }

  return { execute };
}

export type ExecutionDispatchActivity = ReturnType<
  typeof executionDispatchActivity
>;
