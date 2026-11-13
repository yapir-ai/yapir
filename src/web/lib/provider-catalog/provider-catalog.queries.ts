import { eq } from "@tanstack/react-db";
import { query } from "@web/lib/db/query";
import { modelProvidersCollection } from "@web/lib/model-providers/model-provider.collection";

import { providerCatalogCollection } from "./provider-catalog.collection";

export function providerCatalogListQuery() {
  return query((q) =>
    q
      .from({ provider: providerCatalogCollection })
      .orderBy(({ provider }) => provider.name)
  );
}

export function modelProviderCatalogQuery(modelProviderId: string) {
  return query((q) =>
    q
      .from({ modelProvider: modelProvidersCollection })
      .where(({ modelProvider }) => eq(modelProvider.id, modelProviderId))
      .innerJoin(
        { provider: providerCatalogCollection },
        ({ modelProvider, provider }) =>
          eq(modelProvider.catalogId, provider.id)
      )
      .findOne()
  );
}
