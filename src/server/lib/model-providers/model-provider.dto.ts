import type { ModelProviderSelect } from "@server/lib/db/schema";
import { z } from "zod";

export const ModelSchema = z
  .string()
  .trim()
  .min(1)
  .describe(
    "Model ID, among the models of the model provider's entry in the provider catalog"
  );

export const EffortSchema = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .describe(
    "Reasoning effort, among the model's effort levels in the provider catalog. Null keeps the model's default"
  );

export const toResponseDto = (
  modelProvider: Omit<ModelProviderSelect, "apiKey">
) => ({
  id: modelProvider.id,
  deletedAt: modelProvider.deletedAt,
  name: modelProvider.name,
  catalogId: modelProvider.catalogId,
  baseUrl: modelProvider.baseUrl,
});
