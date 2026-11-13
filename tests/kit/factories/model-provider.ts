import { modelProviderTable } from "@server/lib/db/schema";
import type { ModelProviderSelect } from "@server/lib/db/schema";

export function modelProviderRow(
  override?: Partial<ModelProviderSelect>
): ModelProviderSelect {
  return {
    id: "01960000-0000-7000-8000-000000000101",
    name: "OpenCode Go",
    catalogId: "opencode-go",
    baseUrl: "https://opencode.ai/inference/go/openai/v1",
    apiKey: "model-provider-api-key",
    deletedAt: null,
    ...override,
  };
}

modelProviderRow.table = modelProviderTable;
