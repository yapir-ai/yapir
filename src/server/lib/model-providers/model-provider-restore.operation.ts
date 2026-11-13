import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { modelProviderTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { ModelProviderInfoParamsDto } from "./model-provider-info.dto";
import { toResponseDto } from "./model-provider.dto";

export function modelProviderRestoreOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ modelProviderId }: ModelProviderInfoParamsDto) {
    await currentUser.requireAdmin();

    const [modelProvider] = await db
      .update(modelProviderTable)
      .set({ deletedAt: null })
      .where(eq(modelProviderTable.id, modelProviderId))
      .returning();

    if (!modelProvider) {
      throw notFound("MODEL_PROVIDER_NOT_FOUND");
    }

    return toResponseDto(modelProvider);
  }

  return { execute };
}
