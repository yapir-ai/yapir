import type { Db, Transaction } from "@server/lib/db";
import { executionTable } from "@server/lib/db/schema";
import type { AgentSelect, ExecutionSelect } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import type { QueuedExecution } from "@server/lib/executions/dispatcher";
import {
  claimTimeout,
  expiresIn,
  leaseDuration,
} from "@server/lib/executions/execution-lease";
import {
  createSecret,
  hashSecret,
} from "@server/lib/executions/execution-secret";
import { eq } from "drizzle-orm";

import type { LockedTask } from "./command";

export type QueuedAttempt = Pick<ExecutionSelect, "id" | "taskId"> &
  QueuedExecution;

export async function queueAttempt(
  tx: Transaction,
  task: Pick<LockedTask, "id" | "automationId">,
  env: Pick<ApiEnv, "SERVER_URL" | "RUNNER_IMAGE">,
  now: Date
): Promise<QueuedAttempt> {
  const automation = await tx.query.automationTable.findFirst({
    columns: { dispatcher: true },
    with: { ciRepository: { columns: { path: true } } },
    where: { id: task.automationId },
  });

  const { dispatcher, ciRepository } = automation!;
  const claimId = createSecret();

  const [execution] = await tx
    .insert(executionTable)
    .values({
      taskId: task.id,
      dispatcher,
      claimHash: hashSecret(claimId),
      leaseExpiresAt: expiresIn(now, claimTimeout),
      queuedAt: now,
    })
    .returning({ id: executionTable.id });

  const { id } = execution!;

  return {
    id,
    taskId: task.id,
    dispatcher,
    ciRepository,
    payload: {
      executionId: id,
      claimId,
      cacheKey: task.id,
      serverUrl: env.SERVER_URL,
      image: env.RUNNER_IMAGE,
    },
  };
}

export async function startAttempt(
  tx: Transaction,
  attempt: Pick<ExecutionSelect, "id">,
  { agent, tokenHash }: { agent: AgentSelect; tokenHash: string },
  now: Date
) {
  await tx
    .update(executionTable)
    .set({
      tokenHash,
      startedAt: now,
      leaseExpiresAt: expiresIn(now, leaseDuration),
      agentId: agent.id,
      modelProviderId: agent.modelProviderId,
      model: agent.model,
      effort: agent.effort,
      harness: agent.harness,
    })
    .where(eq(executionTable.id, attempt.id));
}

export type UsageColumns = Pick<
  ExecutionSelect,
  | "inputTokens"
  | "outputTokens"
  | "cacheReadTokens"
  | "cacheWriteTokens"
  | "cost"
>;

export async function renewLease(
  tx: Transaction,
  attempt: Pick<ExecutionSelect, "id">,
  usage: UsageColumns | undefined,
  now: Date
) {
  await tx
    .update(executionTable)
    .set({ leaseExpiresAt: expiresIn(now, leaseDuration), ...usage })
    .where(eq(executionTable.id, attempt.id));
}

type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedById: string };

export async function endAttempt(
  tx: Transaction,
  attempt: Pick<ExecutionSelect, "id">,
  end: End,
  now: Date
) {
  await tx
    .update(executionTable)
    .set({ ...end, endedAt: now })
    .where(eq(executionTable.id, attempt.id));
}

export async function findClaimedAttempt(
  db: Db,
  { executionId, claimId }: { executionId: string; claimId: string }
) {
  return await db.query.executionTable.findFirst({
    where: { id: executionId, claimHash: hashSecret(claimId) },
  });
}

export async function attemptOutcome(
  db: Db,
  attempt: Pick<ExecutionSelect, "id">
) {
  const execution = await db.query.executionTable.findFirst({
    columns: { outcome: true },
    where: { id: attempt.id },
  });

  return execution!.outcome;
}

export const leaseError = (attempt: Pick<ExecutionSelect, "startedAt">) =>
  attempt.startedAt
    ? "The runner stopped responding"
    : `No runner claimed the execution within ${claimTimeout / 60_000} minutes`;
