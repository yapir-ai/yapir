import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { connectionTable } from "@server/lib/db/schema";
import { badRequest, notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ConnectionInfoParamsDto } from "./connection-info.dto";
import type { ConnectionUpdateRequestDto } from "./connection-update.dto";
import {
  ConnectionSchema,
  toConnection,
  toConnectionRow,
  toResponseDto,
} from "./connection.dto";

export function connectionUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { type }: ConnectionInfoParamsDto,
    requestDto: ConnectionUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const current = await db.query.connectionTable.findFirst({
      where: { type },
    });

    if (!current) {
      throw notFound("CONNECTION_NOT_FOUND");
    }

    // The resulting Connection must be valid for its type, not only the changed fields.
    const result = ConnectionSchema.safeParse({
      ...toConnection(current),
      ...requestDto,
      type,
    });

    if (!result.success) {
      throw badRequest("CONNECTION_INVALID", z.prettifyError(result.error));
    }

    const [connection] = await db
      .update(connectionTable)
      .set(toConnectionRow(result.data))
      .where(eq(connectionTable.type, type))
      .returning();

    return toResponseDto(connection!);
  }

  return { execute };
}
