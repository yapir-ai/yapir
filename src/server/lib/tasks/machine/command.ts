import type { ProjectAccess } from "@server/lib/auth/access";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db, Transaction } from "@server/lib/db";
import {
  automationTable,
  executionTable,
  taskTable,
} from "@server/lib/db/schema";
import type { ExecutionSelect } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import type { EventResource } from "@server/lib/events/event-definition";
import { eq } from "drizzle-orm";

import type { ActiveTaskState, RestingTaskState, TaskState } from "../task.dto";
import type { TaskService } from "../task.service";
import type { Effect } from "./effects";

type Target =
  | { taskId: string }
  | Pick<ExecutionSelect, "id" | "taskId">
  | { automationId: string; resources: EventResource[] };

export const unchanged = Symbol("unchanged");

interface Change {
  consecutiveFailures?: number;
  effects?: Effect[];
}

export type Transition<To extends TaskState> =
  | ({ to: To & RestingTaskState; attempt?: undefined } & Change)
  | ({
      to: To & ActiveTaskState;
      attempt: Pick<ExecutionSelect, "id">;
    } & Change);

export interface LockedTask<From extends TaskState = TaskState> {
  id: string;
  automationId: string;
  projectId: string;
  state: From;
  consecutiveFailures: number;
  attempt: From extends ActiveTaskState
    ? ExecutionSelect
    : ExecutionSelect | null;
}

export interface Context<From extends TaskState> {
  tx: Transaction;
  now: Date;
  task: LockedTask<From>;
}

interface Declaration<
  From extends TaskState,
  To extends TaskState,
  Input,
  Result extends Transition<To>,
> {
  from: readonly From[];
  to: readonly To[];
  access?: ProjectAccess;
  run: (
    context: Context<From>,
    input: Input
  ) => Promise<Result | typeof unchanged>;
}

type Applied<From extends TaskState, Result> =
  | (Result & { task: LockedTask<From> })
  | { to?: undefined; task: LockedTask };

export function taskCommands({
  db,
  clock,
  currentUser,
  taskService,
  effects,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
  taskService: TaskService;
  effects: (effects: Effect[]) => void;
}) {
  return function command<
    const From extends TaskState,
    const To extends TaskState,
    Input,
    Result extends Transition<To>,
  >({ from, access, run }: Declaration<From, To, Input, Result>) {
    return async (
      target: Target,
      input: Input
    ): Promise<Applied<From, Result>> => {
      const { now } = clock;
      let afterCommit: Effect[] = [];

      const applied = await db.transaction(
        async (tx): Promise<Applied<From, Result>> => {
          const task = await lockTask(tx, target, now);

          if (
            !task ||
            (access &&
              !(await currentUser.hasProjectAccess(access, task.projectId)))
          ) {
            throw notFound("TASK_NOT_FOUND");
          }

          if (!isFrom(from, task) || !holdsActiveAttempt(target, task)) {
            return { task };
          }

          const transition = await run({ tx, now, task }, input);

          if (transition === unchanged) {
            return { task };
          }

          const previous: TaskState = task.state;

          await tx
            .update(taskTable)
            .set({
              state: transition.to,
              activeExecutionId: transition.attempt?.id ?? null,
              consecutiveFailures: transition.consecutiveFailures,
              ...(transition.to !== previous && { stateChangedAt: now }),
            })
            .where(eq(taskTable.id, task.id));

          afterCommit = transition.effects ?? [];

          return { ...transition, task };
        }
      );

      effects(afterCommit);

      return applied;
    };
  };

  async function lockTask(tx: Transaction, target: Target, now: Date) {
    const taskId =
      "taskId" in target
        ? target.taskId
        : await taskService.createTask(
            tx,
            target.automationId,
            target.resources,
            now
          );

    await tx
      .select({ id: taskTable.id })
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .for("update");

    const [task] = await tx
      .select({
        id: taskTable.id,
        automationId: taskTable.automationId,
        projectId: automationTable.projectId,
        state: taskTable.state,
        consecutiveFailures: taskTable.consecutiveFailures,
        attempt: executionTable,
      })
      .from(taskTable)
      .innerJoin(
        automationTable,
        eq(automationTable.id, taskTable.automationId)
      )
      .leftJoin(
        executionTable,
        eq(executionTable.id, taskTable.activeExecutionId)
      )
      .where(eq(taskTable.id, taskId));

    return task;
  }
}

function isFrom<From extends TaskState>(
  from: readonly From[],
  task: LockedTask
): task is LockedTask<From> {
  return from.some((state) => state === task.state);
}

const holdsActiveAttempt = (target: Target, task: LockedTask) =>
  !("id" in target) || target.id === task.attempt?.id;
