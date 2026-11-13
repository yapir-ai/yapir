import { isOrganizationAdmin } from "@server/lib/auth/access";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { userTable } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type {
  UserUpdateParamsDto,
  UserUpdateRequestDto,
} from "./user-update.dto";
import { toResponseDto } from "./user.dto";

export function userUpdateOperation({
  db,
  env,
  currentUser,
}: {
  db: Db;
  env: ApiEnv;
  currentUser: CurrentUser;
}) {
  async function execute(
    { userId }: UserUpdateParamsDto,
    requestDto: UserUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const current = await db.query.userTable.findFirst({
      columns: { email: true },
      where: { id: userId },
    });

    if (!current) {
      throw notFound("USER_NOT_FOUND");
    }

    // The session hook would promote them again at their next sign-in.
    if (
      !isOrganizationAdmin(requestDto) &&
      env.ORGANIZATION_ADMIN_EMAILS.includes(current.email)
    ) {
      throw conflict("USER_ROLE_CONFIGURED");
    }

    const [user] = await db
      .update(userTable)
      .set(requestDto)
      .where(eq(userTable.id, userId))
      .returning();

    return toResponseDto(user!);
  }

  return { execute };
}
