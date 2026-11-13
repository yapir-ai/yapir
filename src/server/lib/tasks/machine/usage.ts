import type { ExecutionSelect } from "@server/lib/db/schema";
import type { ExecutionUsageDto } from "@server/lib/executions/execution-pull.dto";
import type { ModelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";

import type { UsageColumns } from "./attempt";

// It reads the model catalog: run it outside the transaction.
export async function usageColumns(
  modelProviderResolveOperation: ModelProviderResolveOperation,
  { modelProviderId }: Pick<ExecutionSelect, "modelProviderId">,
  usage: ExecutionUsageDto
): Promise<UsageColumns> {
  const { catalogModels } = await modelProviderResolveOperation.execute(
    modelProviderId!
  );

  const costs = usage.map((tokens) => {
    const price = catalogModels.find(({ id }) => id === tokens.model)?.cost;

    return price
      ? (tokens.inputTokens * price.input +
          tokens.outputTokens * price.output +
          tokens.cacheReadTokens * price.cache_read +
          tokens.cacheWriteTokens * price.cache_write) /
          1_000_000
      : null;
  });

  const sum = (key: Exclude<keyof ExecutionUsageDto[number], "model">) =>
    usage.reduce((total, tokens) => total + tokens[key], 0);

  return {
    inputTokens: sum("inputTokens"),
    outputTokens: sum("outputTokens"),
    cacheReadTokens: sum("cacheReadTokens"),
    cacheWriteTokens: sum("cacheWriteTokens"),
    cost: costs.every((cost) => cost !== null)
      ? costs.reduce((total, cost) => total + cost, 0)
      : null,
  };
}
