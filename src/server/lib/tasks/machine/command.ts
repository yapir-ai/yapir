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
import type { ApiEnv } from "@server/lib/env";
import { notFound } from "@server/lib/errors/error.factory";
import type {
  EventNotificationData,
  EventResource,
} from "@server/lib/events/event-definition";
import { eq } from "drizzle-orm";
import { isUnhandled, transition } from "xstate";

import { activeTaskStates } from "../task.dto";
import type { TaskState } from "../task.dto";
import type { TaskService } from "../task.service";
import type { TaskLifecycleEvent } from "../task.statechart";
import { transactionalLifecycle } from "./actions";
import type { Effect } from "./effects";

export type Target =
  | { taskId: string }
  | Pick<ExecutionSelect, "id" | "taskId">
  | { automationId: string; resources: EventResource[] };

export interface LockedTask {
  id: string;
  automationId: string;
  projectId: string;
  state: TaskState;
  consecutiveFailures: number;
  attempt: ExecutionSelect | null;
}

type Awaitable<T> = T | Promise<T>;

type Applied =
  | { task: LockedTask; to: TaskState; events: EventNotificationData[] }
  | { task: LockedTask; to?: undefined };

export function taskCommands({
  db,
  clock,
  env,
  currentUser,
  taskService,
  effects,
}: {
  db: Db;
  clock: Clock;
  env: ApiEnv;
  currentUser: CurrentUser;
  taskService: TaskService;
  effects: (effects: Effect[]) => void;
}) {
  return async function send(
    target: Target,
    prepare: (context: {
      tx: Transaction;
      task: LockedTask;
    }) => Awaitable<TaskLifecycleEvent | undefined>,
    access?: ProjectAccess
  ): Promise<Applied> {
    const { now } = clock;
    let afterCommit: Effect[] = [];

    const applied = await db.transaction(async (tx): Promise<Applied> => {
      const task = await lockTask(tx, target, now);

      if (
        !task ||
        (access &&
          !(await currentUser.hasProjectAccess(access, task.projectId)))
      ) {
        throw notFound("TASK_NOT_FOUND");
      }

      const event =
        holdsActiveAttempt(target, task) && (await prepare({ tx, task }));

      if (!event) {
        return { task };
      }

      const { machine, outcome } = transactionalLifecycle({
        tx,
        now,
        task,
        env,
      });

      const snapshot = machine.resolveState({
        value: task.state,
        context: { consecutiveFailures: task.consecutiveFailures },
      });

      const result = transition(machine, snapshot, event);

      if (isUnhandled(snapshot, result)) {
        return { task };
      }

      const [next, writes] = result;

      for (const write of writes) {
        await write.exec();
      }

      await tx
        .update(taskTable)
        .set({
          state: next.value,
          activeExecutionId: isActive(next.value) ? outcome.attempt!.id : null,
          consecutiveFailures: next.context.consecutiveFailures,
          ...(next.value !== task.state && { stateChangedAt: now }),
        })
        .where(eq(taskTable.id, task.id));

      ({ afterCommit } = outcome);

      return { task, to: next.value, events: outcome.events };
    });

    effects(afterCommit);

    return applied;
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

const isActive = (state: TaskState) =>
  activeTaskStates.some((active) => active === state);

const holdsActiveAttempt = (target: Target, task: LockedTask) =>
  !("id" in target) || target.id === task.attempt?.id;
