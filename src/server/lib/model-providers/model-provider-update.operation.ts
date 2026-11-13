import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { modelProviderTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { ModelProviderInfoParamsDto } from "./model-provider-info.dto";
import type { ModelProviderUpdateRequestDto } from "./model-provider-update.dto";
import { toResponseDto } from "./model-provider.dto";

export function modelProviderUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { modelProviderId }: ModelProviderInfoParamsDto,
    requestDto: ModelProviderUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const current = await db.query.modelProviderTable.findFirst({
      columns: { apiKey: false },
      where: { id: modelProviderId },
    });

    if (!current) {
      throw notFound("MODEL_PROVIDER_NOT_FOUND");
    }

    if (current.deletedAt) {
      throw conflict("MODEL_PROVIDER_DELETED");
    }

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(current);
    }

    const [modelProvider] = await db
      .update(modelProviderTable)
      .set(requestDto)
      .where(eq(modelProviderTable.id, modelProviderId))
      .returning();

    return toResponseDto(modelProvider!);
  }

  return { execute };
}
