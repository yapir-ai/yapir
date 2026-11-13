import { infoQuery, listFilter, query } from "@web/lib/db/query";

import { modelProvidersCollection } from "./model-provider.collection";

export function modelProviderListQuery(search = "", showDeleted = false) {
  const { term, matches } = listFilter(search, showDeleted);

  return {
    queryKey: ["model-providers", term, showDeleted],
    ...query((q) =>
      q
        .from({ modelProvider: modelProvidersCollection })
        .fn.where(({ modelProvider }) =>
          matches(modelProvider.deletedAt, modelProvider.name)
        )
        .orderBy(({ modelProvider }) => modelProvider.id, "desc")
    ),
  };
}

export function modelProviderInfoQuery(modelProviderId: string) {
  return infoQuery(modelProvidersCollection, modelProviderId);
}
