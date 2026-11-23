import type {
  AutomationSelect,
  ExecutionSelect,
  TaskSelect,
  taskEventTable,
} from "@server/lib/db/schema";
import type { Execution } from "@server/lib/executions/execution.workflow";
import type { Task } from "@server/lib/tasks/task.workflow";
import type { Workflow } from "@workflow";
import type { WorkflowSelect } from "@workflow/schema";

type TaskEventSelect = typeof taskEventTable.$inferSelect;

type FieldsOf<W> = {
  [
    K in keyof W as K extends keyof Workflow<unknown>
      ? never
      : W[K] extends (...args: never[]) => void
        ? never
        : K
  ]-?: NonNullable<W[K]> extends { readonly result: unknown }
    ? { child: string } | { value: undefined }
    : { value: W[K] };
};

const eventIds = (events: TaskEventSelect[], state: TaskEventSelect["state"]) =>
  events.flatMap((event) => (event.state === state ? [event.eventId] : []));

export function taskWorkflow(
  task: TaskSelect,
  { dispatcher }: Pick<AutomationSelect, "dispatcher">,
  events: TaskEventSelect[] = []
): Partial<WorkflowSelect> {
  const stored = (
    awakened: boolean,
    pending: string[]
  ): WorkflowSelect["fields"] =>
    ({
      state: { value: task.state },
      stateChangedAt: { value: task.stateChangedAt.getTime() },
      consecutiveFailures: { value: task.consecutiveFailures },
      dispatcher: { value: dispatcher },
      pending: { value: pending },
      awakened: { value: awakened },
      execution: task.activeExecutionId
        ? { child: task.activeExecutionId }
        : { value: undefined },
    }) satisfies FieldsOf<Task>;

  const at = task.stateChangedAt.getTime();
  const start = { kind: "run" as const, args: [], at };

  return {
    id: task.id,
    type: "task",
    rootId: task.id,
    createdAt: task.createdAt,
    ...(task.activeExecutionId
      ? {
          fields: stored(false, []),
          journal: [
            { ...start, fields: stored(false, []) },
            {
              kind: "resolve",
              command: 0,
              of: "until",
              outcome: true,
              fields: stored(true, []),
              at,
            },
            { kind: "start", command: 1, child: task.activeExecutionId },
          ],
        }
      : {
          fields: stored(false, eventIds(events, "pending")),
          journal: [
            { ...start, fields: stored(false, eventIds(events, "pending")) },
          ],
        }),
  };
}

export function executionWorkflow(
  execution: ExecutionSelect,
  events: TaskEventSelect[] = []
): Partial<WorkflowSelect> {
  const stored: WorkflowSelect["fields"] = {
    dispatcher: { value: execution.dispatcher },
    queuedAt: { value: execution.queuedAt.getTime() },
    leaseExpiresAt: { value: execution.leaseExpiresAt.getTime() },
    waiting: { value: eventIds(events, "pending") },
    turn: { value: eventIds(events, "delivered") },
    acknowledged: { value: eventIds(events, "acknowledged") },
    claimed: {
      value: execution.startedAt
        ? {
            tokenHash: execution.tokenHash!,
            startedAt: execution.startedAt.getTime(),
            agent: {
              agentId: execution.agentId,
              modelProviderId: execution.modelProviderId,
              model: execution.model,
              effort: execution.effort,
              harness: execution.harness,
            },
          }
        : undefined,
    },
    usage: {
      value: {
        inputTokens: execution.inputTokens,
        outputTokens: execution.outputTokens,
        cacheReadTokens: execution.cacheReadTokens,
        cacheWriteTokens: execution.cacheWriteTokens,
        cost: execution.cost,
      },
    },
    end: { value: undefined },
  } satisfies FieldsOf<Execution>;

  return {
    id: execution.id,
    type: "execution",
    rootId: execution.taskId,
    parentId: execution.taskId,
    createdAt: execution.queuedAt,
    fields: stored,
    journal: [
      {
        kind: "run",
        args: [eventIds(events, "pending"), execution.dispatcher],
        fields: stored,
        at: execution.queuedAt.getTime(),
      },
    ],
    wakeAt: execution.leaseExpiresAt,
  };
}
