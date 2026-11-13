import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { ModelProviderListRequestDto } from "./model-provider-list.dto";
import { toResponseDto } from "./model-provider.dto";

export function modelProviderListOperation({ db }: { db: Db }) {
  async function execute({
    offset,
    limit,
    id,
    order,
  }: ModelProviderListRequestDto) {
    const modelProviders = await db.query.modelProviderTable.findMany({
      columns: { apiKey: false },
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: modelProviders.map(toResponseDto) };
  }

  return { execute };
}

export type ModelProviderListOperation = ReturnType<
  typeof modelProviderListOperation
>;
