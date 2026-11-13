import type { Db } from "@server/lib/db";
import { conflict, notFound } from "@server/lib/errors/error.factory";

export async function requireModelProvider(db: Db, modelProviderId: string) {
  const modelProvider = await db.query.modelProviderTable.findFirst({
    columns: { catalogId: true, deletedAt: true },
    where: { id: modelProviderId },
  });

  if (!modelProvider) {
    throw notFound("MODEL_PROVIDER_NOT_FOUND");
  }

  if (modelProvider.deletedAt) {
    throw conflict("MODEL_PROVIDER_DELETED");
  }

  return modelProvider;
}
