import type { Transaction } from "@server/lib/db";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import type { EventNotificationData } from "@server/lib/events/event-definition";

import { taskLifecycle } from "../task.statechart";
import { endAttempt, queueAttempt, renewLease, startAttempt } from "./attempt";
import type { LockedTask } from "./command";
import { dispatch, release } from "./effects";
import type { Effect } from "./effects";
import {
  acknowledgeTurnEvents,
  deliverPendingEvents,
  receiveEvent,
  returnTurnEvents,
} from "./inbox";

interface Outcome {
  attempt: Pick<ExecutionSelect, "id" | "taskId" | "dispatcher"> | null;
  events: EventNotificationData[];
  afterCommit: Effect[];
}

export function transactionalLifecycle({
  tx,
  now,
  task,
  env,
}: {
  tx: Transaction;
  now: Date;
  task: LockedTask;
  env: Pick<ApiEnv, "SERVER_URL" | "RUNNER_IMAGE">;
}) {
  const outcome: Outcome = {
    attempt: task.attempt,
    events: [],
    afterCommit: [],
  };

  const attempt = () => outcome.attempt!;

  const machine = taskLifecycle.provide({
    actions: {
      async receiveEvent(event) {
        await receiveEvent(tx, task, event, now);
      },

      async queueAttempt() {
        const queued = await queueAttempt(tx, task, env, now);
        outcome.attempt = { ...queued, taskId: task.id };
        outcome.afterCommit.push(dispatch(queued));
      },

      async startAttempt(start) {
        await startAttempt(tx, attempt(), start, now);
      },

      async renewLease(usage) {
        await renewLease(tx, attempt(), usage, now);
      },

      async deliverPendingEvents() {
        outcome.events = await deliverPendingEvents(tx, attempt());
      },

      async acknowledgeTurnEvents() {
        await acknowledgeTurnEvents(tx, attempt());
      },

      async returnTurnEvents() {
        await returnTurnEvents(tx, attempt());
      },

      async endAttempt(end) {
        await endAttempt(tx, attempt(), end, now);
      },

      release() {
        outcome.afterCommit.push(release(attempt()));
      },
    },
  });

  return { machine, outcome };
}
