import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import type { AgentSelect, ExecutionSelect } from "@server/lib/db/schema";
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
  endAttempt,
  findClaimedAttempt,
  findExpiredAttempts,
  leaseError,
  queueAttempt,
  renewLease,
  startAttempt,
} from "./machine/attempt";
import type { UsageColumns } from "./machine/attempt";
import { ciRepository, claimContext } from "./machine/claim-context";
import { taskCommands, unchanged } from "./machine/command";
import type { Context, Transition } from "./machine/command";
import { dispatch, effectRunner, release } from "./machine/effects";
import {
  acknowledgeTurnEvents,
  deliverPendingEvents,
  hasPendingEvents,
  receiveEvent,
  returnTurnEvents,
} from "./machine/inbox";
import { usageColumns } from "./machine/usage";
import { TaskStateSchema } from "./task.dto";
import type { TaskService } from "./task.service";

const maxConsecutiveFailures = 3;

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
  const command = taskCommands({
    db,
    clock,
    currentUser,
    taskService,
    effects: effectRunner({ dispatchers, executionContext }),
  });

  const table = {
    accept: command({
      from: TaskStateSchema.options,
      to: ["queued"],
      async run({ tx, now, task }, event: PreparedEvent) {
        if (!(await receiveEvent(tx, task, event, now))) {
          return unchanged;
        }

        if (task.attempt) {
          return unchanged;
        }

        const queued = await queueAttempt(tx, task, env, now);

        return { to: "queued", attempt: queued, effects: [dispatch(queued)] };
      },
    }),

    claim: command({
      from: ["queued"],
      to: ["running"],
      async run(
        { tx, now, task },
        start: { agent: AgentSelect; tokenHash: string }
      ) {
        await startAttempt(tx, task.attempt, start, now);

        return { to: "running", attempt: task.attempt };
      },
    }),

    pull: command({
      from: ["running"],
      to: ["running"],
      async run({ tx, now, task }, usage: UsageColumns | undefined) {
        await renewLease(tx, task.attempt, usage, now);
        const events = await deliverPendingEvents(tx, task.attempt);

        return { to: "running", attempt: task.attempt, events };
      },
    }),

    endTurn: command({
      from: ["running"],
      to: ["running", "idle"],
      async run({ tx, now, task }, usage: UsageColumns | undefined) {
        await renewLease(tx, task.attempt, usage, now);
        await acknowledgeTurnEvents(tx, task.attempt);
        const events = await deliverPendingEvents(tx, task.attempt);

        if (events.length > 0) {
          return { to: "running", attempt: task.attempt, events };
        }

        await endAttempt(tx, task.attempt, { outcome: "succeeded" }, now);

        return { to: "idle", consecutiveFailures: 0, events };
      },
    }),

    fail: command({
      from: ["queued", "running"],
      to: ["idle", "queued", "blocked"],
      run: async (context, { error }: ExecutionFailRequestDto) =>
        await failAttempt(context, error),
    }),

    expire: command({
      from: ["queued", "running"],
      to: ["idle", "queued", "blocked"],
      async run(context, { expiredBefore }: { expiredBefore: Date }) {
        const { attempt } = context.task;

        // A pull may have renewed the lease since the sweep read it.
        if (attempt.leaseExpiresAt >= expiredBefore) {
          return unchanged;
        }

        return await failAttempt(context, leaseError(attempt));
      },
    }),

    stop: command({
      access: "write",
      from: ["queued", "running"],
      to: ["stopped"],
      async run({ tx, now, task }, { stoppedById }: { stoppedById: string }) {
        await endAttempt(
          tx,
          task.attempt,
          { outcome: "stopped", stoppedById },
          now
        );
        await returnTurnEvents(tx, task.attempt);

        return { to: "stopped", effects: [release(task.attempt)] };
      },
    }),
  };

  async function failAttempt(
    { tx, now, task }: Context<"queued" | "running">,
    error: string
  ): Promise<Transition<"idle" | "queued" | "blocked">> {
    await endAttempt(tx, task.attempt, { outcome: "failed", error }, now);
    await returnTurnEvents(tx, task.attempt);
    const consecutiveFailures = task.consecutiveFailures + 1;
    const effects = [release(task.attempt)];

    if (!(await hasPendingEvents(tx, task))) {
      return { to: "idle", consecutiveFailures, effects };
    }

    if (consecutiveFailures >= maxConsecutiveFailures) {
      return { to: "blocked", consecutiveFailures, effects };
    }

    const queued = await queueAttempt(tx, task, env, now);

    return {
      to: "queued",
      attempt: queued,
      consecutiveFailures,
      effects: [...effects, dispatch(queued)],
    };
  }

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
    accept: table.accept,

    async claim({
      executionId,
      claimId,
      identityToken,
    }: ExecutionClaimRequestDto) {
      const attempt = await findClaimedAttempt(db, env, {
        executionId,
        claimId,
      });

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

      const claimed = await table.claim(attempt, {
        agent: context.agent,
        tokenHash: hashSecret(token),
      });

      return claimed.to
        ? { claimed: true as const, token, taskId: attempt.taskId, ...runner }
        : {
            claimed: false as const,
            outcome: await attemptOutcome(db, attempt),
          };
    },

    async pull(execution: ExecutionSelect, request: ExecutionPullRequestDto) {
      const pulled = await table.pull(
        execution,
        await usageOf(execution, request)
      );

      return pulled.to ? turn(pulled.events) : await ended(execution);
    },

    async endTurn(
      execution: ExecutionSelect,
      request: ExecutionPullRequestDto
    ) {
      const turnEnded = await table.endTurn(
        execution,
        await usageOf(execution, request)
      );

      return turnEnded.to === "running"
        ? turn(turnEnded.events)
        : await ended(execution);
    },

    async fail(execution: ExecutionSelect, request: ExecutionFailRequestDto) {
      await table.fail(execution, request);

      return await ended(execution);
    },

    async expire() {
      const { now } = clock;
      const expired = await findExpiredAttempts(db, now);

      await Promise.all(
        expired.map(
          async (attempt) => await table.expire(attempt, { expiredBefore: now })
        )
      );
    },

    async stop({ taskId }: { taskId: string }) {
      const user = await currentUser.get();
      await table.stop({ taskId }, { stoppedById: user.id });
    },
  };
}

export type TaskMachine = ReturnType<typeof taskMachine>;
