import type { ExecutionSelect } from "@server/lib/db/schema";
import { z } from "zod";

// The web and the runner import this file: it must depend only on Zod.
export const ExecutionOutcomeSchema = z.enum([
  "succeeded",
  "failed",
  "stopped",
]);

export type ExecutionOutcome = z.infer<typeof ExecutionOutcomeSchema>;

export const attemptState = (execution: {
  outcome: ExecutionOutcome | null;
  startedAt: unknown;
}) => execution.outcome ?? (execution.startedAt ? "running" : "queued");

export type AttemptState = ReturnType<typeof attemptState>;

export const toResponseDto = (execution: ExecutionSelect) => ({
  id: execution.id,
  taskId: execution.taskId,
  agentId: execution.agentId,
  outcome: execution.outcome,
  queuedAt: execution.queuedAt.toISOString(),
  startedAt: execution.startedAt?.toISOString() ?? null,
  endedAt: execution.endedAt?.toISOString() ?? null,
  stoppedById: execution.stoppedById,
  error: execution.error,
  usage: {
    inputTokens: execution.inputTokens,
    outputTokens: execution.outputTokens,
    cacheReadTokens: execution.cacheReadTokens,
    cacheWriteTokens: execution.cacheWriteTokens,
    cost: execution.cost,
  },
});
