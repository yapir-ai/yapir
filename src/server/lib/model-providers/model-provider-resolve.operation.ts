import type { Db } from "@server/lib/db";
import type { ProviderCatalogListOperation } from "@server/lib/provider-catalog/provider-catalog-list.operation";

export function modelProviderResolveOperation({
  db,
  providerCatalogListOperation,
}: {
  db: Db;
  providerCatalogListOperation: ProviderCatalogListOperation;
}) {
  async function execute(modelProviderId: string) {
    const modelProvider = (await db.query.modelProviderTable.findFirst({
      where: { id: modelProviderId },
    }))!;

    const catalogProvider = (await providerCatalogListOperation.execute()).find(
      ({ id }) => id === modelProvider.catalogId
    );

    const catalogModels = catalogProvider?.models ?? [];
    const followsCatalog = catalogProvider?.baseUrl === modelProvider.baseUrl;

    const endpoints = catalogModels.flatMap((model) =>
      model.baseUrl
        ? [
            {
              id: model.id,
              baseUrl: followsCatalog ? model.baseUrl : modelProvider.baseUrl,
            },
          ]
        : []
    );

    return { modelProvider, catalogModels, endpoints };
  }

  return { execute };
}

export type ModelProviderResolveOperation = ReturnType<
  typeof modelProviderResolveOperation
>;
