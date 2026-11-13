import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { connectionTable } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import { conflict } from "@server/lib/errors/error.factory";
import { gitlabWebhookSync } from "@server/lib/gitlab/gitlab-webhook-sync";

import type { ConnectionCreateRequestDto } from "./connection-create.dto";
import { toConnection, toConnectionRow, toResponseDto } from "./connection.dto";

export function connectionCreateOperation({
  db,
  env,
  executionContext,
  currentUser,
}: {
  db: Db;
  env: ApiEnv;
  executionContext: Pick<ExecutionContext, "waitUntil">;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: ConnectionCreateRequestDto) {
    await currentUser.requireAdmin();

    const [connection] = await db
      .insert(connectionTable)
      .values(toConnectionRow(requestDto))
      .onConflictDoNothing()
      .returning();

    if (!connection) {
      throw conflict("CONNECTION_EXISTS");
    }

    const created = toConnection(connection);

    if (created.type === "gitlab") {
      executionContext.waitUntil(
        gitlabWebhookSync(created, { db, env }).execute()
      );
    }

    return toResponseDto(connection);
  }

  return { execute };
}
