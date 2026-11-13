import { z } from "zod";

const TokenCount = z.number().int().nonnegative();

// The runner imports this schema at runtime: it must depend only on Zod.
// Input tokens exclude the cache, output tokens include the reasoning.
const ExecutionUsage = z.array(
  z.object({
    model: z.string(),
    inputTokens: TokenCount,
    outputTokens: TokenCount,
    cacheReadTokens: TokenCount,
    cacheWriteTokens: TokenCount,
  })
);

export type ExecutionUsageDto = z.infer<typeof ExecutionUsage>;

export const ExecutionPullRequest = z.object({
  usage: ExecutionUsage.optional(),
});

export type ExecutionPullRequestDto = z.infer<typeof ExecutionPullRequest>;
