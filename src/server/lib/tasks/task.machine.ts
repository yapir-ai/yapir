import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import { unauthorized } from "@server/lib/errors/error.factory";
import type {
  EventNotificationData,
  PreparedEvent,
} from "@server/lib/events/event-definition";
import type { Dispatchers } from "@server/lib/executions/dispatcher";
import type { ExecutionClaimRequestDto } from "@server/lib/executions/execution-claim.dto";
import type { ExecutionFailRequestDto } from "@server/lib/executions/execution-fail.dto";
import type { ExecutionPullRequestDto } from "@server/lib/executions/execution-pull.dto";
import {
  createSecret,
  hashSecret,
} from "@server/lib/executions/execution-secret";
import type { ModelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";

import {
  attemptOutcome,
  findClaimedAttempt,
  findExpiredAttempts,
  leaseError,
} from "./machine/attempt";
import { ciRepository, claimContext } from "./machine/claim-context";
import { taskCommands } from "./machine/command";
import type { Target } from "./machine/command";
import { effectRunner } from "./machine/effects";
import {
  hasEvent,
  hasPendingEvents,
  hasUnacknowledgedEvents,
} from "./machine/inbox";
import { usageColumns } from "./machine/usage";
import type { TaskService } from "./task.service";

export function taskMachine({
  db,
  clock,
  env,
  currentUser,
  dispatchers,
  executionContext,
  taskService,
  modelProviderResolveOperation,
}: {
  db: Db;
  clock: Clock;
  env: ApiEnv;
  currentUser: CurrentUser;
  dispatchers: Promise<Dispatchers>;
  executionContext: Pick<ExecutionContext, "waitUntil">;
  taskService: TaskService;
  modelProviderResolveOperation: ModelProviderResolveOperation;
}) {
  const send = taskCommands({
    db,
    clock,
    env,
    currentUser,
    taskService,
    effects: effectRunner({ dispatchers, executionContext }),
  });

  const turn = (events: EventNotificationData[]) => ({
    attempt: "running" as const,
    events,
  });

  const ended = async (attempt: Pick<ExecutionSelect, "id">) => ({
    attempt: (await attemptOutcome(db, attempt))!,
  });

  const usageOf = async (
    execution: ExecutionSelect,
    { usage }: ExecutionPullRequestDto
  ) =>
    usage &&
    (await usageColumns(modelProviderResolveOperation, execution, usage));

  return {
    async accept(target: Target, event: PreparedEvent) {
      return await send(target, async ({ tx, task }) => ({
        type: "accept",
        event,
        duplicate: await hasEvent(tx, task, event),
      }));
    },

    async claim({
      executionId,
      claimId,
      identityToken,
    }: ExecutionClaimRequestDto) {
      const attempt = await findClaimedAttempt(db, { executionId, claimId });

      if (!attempt) {
        throw unauthorized("EXECUTION_CLAIM_INVALID");
      }

      const context = await taskService.load(attempt.taskId);
      const dispatcher = (await dispatchers).get(attempt.dispatcher)!;
      await dispatcher.authenticate(identityToken, ciRepository(context));

      // Before the claim: a failure here leaves the attempt queued, never running without a runner.
      const runner = await claimContext(
        { db, modelProviderResolveOperation },
        context
      );

      const token = createSecret();

      const claimed = await send(attempt, () => ({
        type: "claim",
        agent: context.agent,
        tokenHash: hashSecret(token),
      }));

      return claimed.to
        ? { claimed: true as const, token, taskId: attempt.taskId, ...runner }
        : {
            claimed: false as const,
            outcome: await attemptOutcome(db, attempt),
          };
    },

    async pull(execution: ExecutionSelect, request: ExecutionPullRequestDto) {
      const usage = await usageOf(execution, request);

      const pulled = await send(execution, () => ({
        type: "pull",
        usage,
      }));

      return pulled.to ? turn(pulled.events) : await ended(execution);
    },

    async endTurn(
      execution: ExecutionSelect,
      request: ExecutionPullRequestDto
    ) {
      const usage = await usageOf(execution, request);

      const turnEnded = await send(execution, async ({ tx, task }) => ({
        type: "endTurn",
        usage,
        pending: await hasPendingEvents(tx, task),
      }));

      return turnEnded.to === "running"
        ? turn(turnEnded.events)
        : await ended(execution);
    },

    async fail(execution: ExecutionSelect, { error }: ExecutionFailRequestDto) {
      await send(execution, async ({ tx, task }) => ({
        type: "fail",
        error,
        pending: await hasUnacknowledgedEvents(tx, task),
      }));

      return await ended(execution);
    },

    async expire() {
      const { now } = clock;
      const expired = await findExpiredAttempts(db, now);

      await Promise.all(
        expired.map(
          async (execution) =>
            await send(execution, async ({ tx, task }) => {
              const attempt = task.attempt!;

              // A pull may have renewed the lease since the sweep read it.
              if (attempt.leaseExpiresAt >= now) {
                return;
              }

              return {
                type: "fail",
                error: leaseError(attempt),
                pending: await hasUnacknowledgedEvents(tx, task),
              };
            })
        )
      );
    },

    async stop({ taskId }: { taskId: string }) {
      const user = await currentUser.get();

      await send(
        { taskId },
        () => ({ type: "stop", stoppedById: user.id }),
        "write"
      );
    },
  };
}

export type TaskMachine = ReturnType<typeof taskMachine>;
