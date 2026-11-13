import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { ModelProviderInfoParamsDto } from "./model-provider-info.dto";
import { toResponseDto } from "./model-provider.dto";

export function modelProviderInfoOperation({ db }: { db: Db }) {
  async function execute({ modelProviderId }: ModelProviderInfoParamsDto) {
    const modelProvider = await db.query.modelProviderTable.findFirst({
      columns: { apiKey: false },
      where: { id: modelProviderId },
    });

    if (!modelProvider) {
      throw notFound("MODEL_PROVIDER_NOT_FOUND");
    }

    return toResponseDto(modelProvider);
  }

  return { execute };
}
