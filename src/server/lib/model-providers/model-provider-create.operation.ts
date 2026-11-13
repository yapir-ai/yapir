import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { modelProviderTable } from "@server/lib/db/schema";

import type { ModelProviderCreateRequestDto } from "./model-provider-create.dto";
import { toResponseDto } from "./model-provider.dto";

export function modelProviderCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: ModelProviderCreateRequestDto) {
    await currentUser.requireAdmin();

    const [modelProvider] = await db
      .insert(modelProviderTable)
      .values(requestDto)
      .returning();

    return toResponseDto(modelProvider!);
  }

  return { execute };
}
