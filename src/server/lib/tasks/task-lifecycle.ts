import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db, Transaction } from "@server/lib/db";
import { taskEventTable } from "@server/lib/db/schema";
import type { AgentSelect, ExecutionSelect } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import { notFound, unauthorized } from "@server/lib/errors/error.factory";
import type {
  EventResource,
  PreparedEvent,
} from "@server/lib/events/event-definition";
import type { Dispatchers } from "@server/lib/executions/dispatcher";
import type { ExecutionClaimRequestDto } from "@server/lib/executions/execution-claim.dto";
import type { ExecutionFailRequestDto } from "@server/lib/executions/execution-fail.dto";
import type { ExecutionPullRequestDto } from "@server/lib/executions/execution-pull.dto";
import {
  createSecret,
  hashSecret,
  isClaimId,
} from "@server/lib/executions/execution-secret";
import { usageColumns } from "@server/lib/executions/execution-usage";
import type { ExecutionOutcome } from "@server/lib/executions/execution.dto";
import { Execution } from "@server/lib/executions/execution.workflow";
import type { ModelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";
import { WorkflowNotFoundError } from "@workflow";
import type { Updates, WorkflowEngine } from "@workflow";

import { ciRepository, claimContext } from "./task-claim-context";
import type { TaskService } from "./task.service";
import { Task } from "./task.workflow";

type Target =
  | { taskId: string }
  | { automationId: string; resources: EventResource[] };

type Turn = { end: ExecutionOutcome } | { events: string[] };

const agentSnapshot = (agent: AgentSelect) => ({
  agentId: agent.id,
  modelProviderId: agent.modelProviderId,
  model: agent.model,
  effort: agent.effort,
  harness: agent.harness,
});

export function taskLifecycle({
  db,
  clock,
  env,
  currentUser,
  dispatchers,
  taskService,
  workflowEngine,
  modelProviderResolveOperation,
}: {
  db: Db;
  clock: Clock;
  env: ApiEnv;
  currentUser: CurrentUser;
  dispatchers: Promise<Dispatchers>;
  taskService: TaskService;
  workflowEngine: WorkflowEngine<Transaction>;
  modelProviderResolveOperation: ModelProviderResolveOperation;
}) {
  async function accept(target: Target, event: PreparedEvent) {
    const { now } = clock;

    return await workflowEngine.transaction(async ({ tx, start }) => {
      const taskId =
        "taskId" in target
          ? target.taskId
          : await taskService.createTask(
              tx,
              target.automationId,
              target.resources,
              now
            );

      const task = await tx.query.taskTable.findFirst({
        columns: { id: true },
        with: { automation: { columns: { dispatcher: true } } },
        where: { id: taskId },
      });

      if (!task) {
        throw notFound("TASK_NOT_FOUND");
      }

      if (await receiveEvent(tx, taskId, event, now)) {
        await start(Task, taskId).receive(event.id, task.automation.dispatcher);
      }

      return taskId;
    });
  }

  async function receiveEvent(
    tx: Transaction,
    taskId: string,
    event: PreparedEvent,
    now: Date
  ) {
    const received = await tx
      .insert(taskEventTable)
      .values({
        taskId,
        eventId: event.id,
        receivedAt: now,
        notification: {
          type: event.type,
          data: event.data,
          author: event.author,
        },
      })
      .onConflictDoNothing()
      .returning({ eventId: taskEventTable.eventId });

    return received.length > 0;
  }

  async function claim({
    executionId,
    claimId,
    identityToken,
  }: ExecutionClaimRequestDto) {
    const execution =
      isClaimId(claimId, executionId, env) &&
      (await db.query.executionTable.findFirst({
        where: { id: executionId },
      }));

    if (!execution) {
      throw unauthorized("EXECUTION_CLAIM_INVALID");
    }

    const context = await taskService.load(execution.taskId);
    const dispatcher = (await dispatchers).get(execution.dispatcher)!;
    await dispatcher.authenticate(identityToken, ciRepository(context));

    // Before the claim: a failure here leaves the execution queued, never running without a runner.
    const runner = await claimContext(
      { db, modelProviderResolveOperation },
      context
    );

    const token = createSecret();

    const claimed = execution.outcome
      ? { claimed: false as const, outcome: execution.outcome }
      : await workflowEngine.get(Execution, execution.id).claim({
          tokenHash: hashSecret(token),
          agent: agentSnapshot(context.agent),
        });

    return claimed.claimed
      ? { claimed: true as const, token, taskId: execution.taskId, ...runner }
      : claimed;
  }

  const usageOf = async (
    execution: ExecutionSelect,
    { usage }: ExecutionPullRequestDto
  ) =>
    usage &&
    (await usageColumns(modelProviderResolveOperation, execution, usage));

  async function answer(execution: ExecutionSelect, turn: Turn) {
    if ("end" in turn) {
      return { attempt: turn.end };
    }

    const events = await db.query.taskEventTable.findMany({
      columns: { notification: true },
      where: { taskId: execution.taskId, eventId: { in: turn.events } },
      orderBy: { receivedAt: "asc" },
    });

    return {
      attempt: "running" as const,
      events: events.map(({ notification }) => notification),
    };
  }

  async function call(
    execution: ExecutionSelect,
    turn: (handle: Updates<Execution>) => Promise<Turn>
  ) {
    return await answer(
      execution,
      execution.outcome
        ? { end: execution.outcome }
        : await turn(workflowEngine.get(Execution, execution.id))
    );
  }

  const pull = async (
    execution: ExecutionSelect,
    request: ExecutionPullRequestDto
  ) =>
    await call(
      execution,
      async (handle) => await handle.pull(await usageOf(execution, request))
    );

  const endTurn = async (
    execution: ExecutionSelect,
    request: ExecutionPullRequestDto
  ) =>
    await call(
      execution,
      async (handle) => await handle.endTurn(await usageOf(execution, request))
    );

  const fail = async (
    execution: ExecutionSelect,
    { error }: ExecutionFailRequestDto
  ) => await call(execution, async (handle) => await handle.fail(error));

  async function stop({ taskId }: { taskId: string }) {
    const task = await db.query.taskTable.findFirst({
      columns: {},
      with: { automation: { columns: { projectId: true } } },
      where: { id: taskId },
    });

    if (
      !task ||
      !(await currentUser.hasProjectAccess("write", task.automation.projectId))
    ) {
      throw notFound("TASK_NOT_FOUND");
    }

    const user = await currentUser.get();

    try {
      await workflowEngine.get(Task, taskId).stop(user.id);
    } catch (error) {
      throw error instanceof WorkflowNotFoundError
        ? notFound("TASK_NOT_FOUND")
        : error;
    }
  }

  return { accept, claim, pull, endTurn, fail, stop };
}

export type TaskLifecycle = ReturnType<typeof taskLifecycle>;
