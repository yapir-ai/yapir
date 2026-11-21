import {
  claimTimeout,
  leaseDuration,
  maxConsecutiveFailures,
} from "../contract";
import type {
  Deps,
  Outcome,
  TaskEvent,
  TaskState,
  TaskView,
  Usage,
} from "../contract";

// The shape of today's task machine, with rows in memory: a table of guarded
// commands, a lease per execution that a sweep expires, effects after commit.

interface ExecutionRow {
  id: string;
  taskId: string;
  outcome: Outcome | null;
  error?: string;
  stoppedBy?: string;
  usage?: Usage;
  startedAt: number | null;
  leaseExpiresAt: number;
}

interface TaskEventRow {
  event: TaskEvent;
  state: "pending" | "delivered" | "acknowledged";
  executionId: string | null;
}

interface TaskRow {
  id: string;
  state: TaskState;
  consecutiveFailures: number;
  activeExecutionId: string | null;
  events: TaskEventRow[];
  executionIds: string[];
}

export interface Database {
  tasks: Map<string, TaskRow>;
  executions: Map<string, ExecutionRow>;
}

type Effect =
  | { type: "dispatch"; executionId: string }
  | { type: "release"; executionId: string };

interface Transition {
  to: TaskState;
  attempt?: ExecutionRow;
  consecutiveFailures?: number;
  effects?: Effect[];
  events?: TaskEvent[];
}

const unchanged = Symbol("unchanged");

type ActiveTask = TaskRow & { attempt: ExecutionRow };

export function taskMachine(db: Database, deps: Deps, clock: { now: number }) {
  function command<Input>(
    from: readonly TaskState[],
    run: (task: ActiveTask, input: Input) => Transition | typeof unchanged
  ) {
    return (target: { taskId: string } | ExecutionRow, input: Input) => {
      const task = lockTask(target.taskId);
      const attempt = db.executions.get(task.activeExecutionId ?? "");

      if (
        !from.includes(task.state) ||
        ("id" in target && target.id !== attempt?.id)
      ) {
        return;
      }

      // SAFETY: an active state holds an attempt, and `accept` reads it as optional.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const transition = run({ ...task, attempt } as ActiveTask, input);

      if (transition === unchanged) {
        return;
      }

      task.state = transition.to;
      task.activeExecutionId = transition.attempt?.id ?? null;
      task.consecutiveFailures =
        transition.consecutiveFailures ?? task.consecutiveFailures;
      runEffects(transition.effects ?? []);

      return transition;
    };
  }

  function lockTask(taskId: string) {
    const existing = db.tasks.get(taskId);

    if (existing) {
      return existing;
    }

    const created: TaskRow = {
      id: taskId,
      state: "idle",
      consecutiveFailures: 0,
      activeExecutionId: null,
      events: [],
      executionIds: [],
    };

    db.tasks.set(taskId, created);

    return created;
  }

  function runEffects(effects: Effect[]) {
    for (const { type, executionId } of effects) {
      if (type === "release") {
        void deps.release(executionId);
      } else {
        void deps.dispatch(executionId).catch((error: Error) => {
          const execution = db.executions.get(executionId)!;
          table.fail(execution, { error: error.message });
        });
      }
    }
  }

  function queueAttempt(task: TaskRow) {
    const execution: ExecutionRow = {
      id: crypto.randomUUID(),
      taskId: task.id,
      outcome: null,
      startedAt: null,
      leaseExpiresAt: clock.now + claimTimeout,
    };

    db.executions.set(execution.id, execution);
    task.executionIds.push(execution.id);

    return execution;
  }

  function renewLease(attempt: ExecutionRow, usage: Usage | undefined) {
    attempt.leaseExpiresAt = clock.now + leaseDuration;
    attempt.usage = usage ?? attempt.usage;
  }

  function deliverPendingEvents(task: ActiveTask) {
    const pending = task.events.filter(({ state }) => state === "pending");

    for (const row of pending) {
      row.state = "delivered";
      row.executionId = task.attempt.id;
    }

    return pending.map(({ event }) => event);
  }

  const turnEvents = (task: ActiveTask) =>
    task.events.filter(
      ({ state, executionId }) =>
        state === "delivered" && executionId === task.attempt.id
    );

  function returnTurnEvents(task: ActiveTask) {
    for (const row of turnEvents(task)) {
      row.state = "pending";
      row.executionId = null;
    }
  }

  function failAttempt(task: ActiveTask, error: string): Transition {
    task.attempt.outcome = "failed";
    task.attempt.error = error;
    returnTurnEvents(task);
    const consecutiveFailures = task.consecutiveFailures + 1;

    const effects: Effect[] = [
      { type: "release", executionId: task.attempt.id },
    ];

    if (!task.events.some(({ state }) => state === "pending")) {
      return { to: "idle", consecutiveFailures, effects };
    }

    if (consecutiveFailures >= maxConsecutiveFailures) {
      return { to: "blocked", consecutiveFailures, effects };
    }

    const queued = queueAttempt(task);

    return {
      to: "queued",
      attempt: queued,
      consecutiveFailures,
      effects: [...effects, { type: "dispatch", executionId: queued.id }],
    };
  }

  const table = {
    accept: command(
      ["idle", "queued", "running", "blocked", "stopped"],
      (task, event: TaskEvent) => {
        if (task.events.some((row) => row.event.id === event.id)) {
          return unchanged;
        }

        db.tasks
          .get(task.id)!
          .events.push({ event, state: "pending", executionId: null });

        if (task.activeExecutionId) {
          return unchanged;
        }

        const queued = queueAttempt(db.tasks.get(task.id)!);

        return {
          to: "queued",
          attempt: queued,
          effects: [{ type: "dispatch", executionId: queued.id }],
        };
      }
    ),

    claim: command(["queued"], (task, _input: undefined) => {
      task.attempt.startedAt = clock.now;
      task.attempt.leaseExpiresAt = clock.now + leaseDuration;

      return { to: "running", attempt: task.attempt };
    }),

    pull: command(["running"], (task, usage: Usage | undefined) => {
      renewLease(task.attempt, usage);

      return {
        to: "running",
        attempt: task.attempt,
        events: deliverPendingEvents(task),
      };
    }),

    endTurn: command(["running"], (task, usage: Usage | undefined) => {
      renewLease(task.attempt, usage);

      for (const row of turnEvents(task)) {
        row.state = "acknowledged";
      }

      const events = deliverPendingEvents(task);

      if (events.length > 0) {
        return { to: "running", attempt: task.attempt, events };
      }

      task.attempt.outcome = "succeeded";

      return { to: "idle", consecutiveFailures: 0 };
    }),

    fail: command(["queued", "running"], (task, { error }: { error: string }) =>
      failAttempt(task, error)
    ),

    expire: command(["queued", "running"], (task, _input: undefined) => {
      if (task.attempt.leaseExpiresAt > clock.now) {
        return unchanged;
      }

      return failAttempt(
        task,
        task.attempt.startedAt === null
          ? "No runner claimed the execution within 10 minutes"
          : "The runner stopped responding"
      );
    }),

    stop: command(
      ["queued", "running"],
      (task, { stoppedBy }: { stoppedBy: string }) => {
        task.attempt.outcome = "stopped";
        task.attempt.stoppedBy = stoppedBy;
        returnTurnEvents(task);

        return {
          to: "stopped",
          effects: [{ type: "release", executionId: task.attempt.id }],
        };
      }
    ),
  };

  const ended = (execution: ExecutionRow) => ({ attempt: execution.outcome! });

  return {
    accept: table.accept,
    stop: table.stop,

    async claim(executionId: string, identityToken: string) {
      const execution = db.executions.get(executionId);

      if (!execution) {
        throw new Error("EXECUTION_CLAIM_INVALID");
      }

      await deps.authenticateRunner(executionId, identityToken);
      const context = await deps.claimContext(execution.taskId);

      return table.claim(execution, undefined)
        ? { claimed: true as const, context }
        : { claimed: false as const, outcome: execution.outcome };
    },

    pull(execution: ExecutionRow, usage: Usage | undefined) {
      const pulled = table.pull(execution, usage);

      return pulled
        ? { attempt: "running" as const, events: pulled.events! }
        : ended(execution);
    },

    endTurn(execution: ExecutionRow, usage: Usage | undefined) {
      const turnEnded = table.endTurn(execution, usage);

      return turnEnded?.to === "running"
        ? { attempt: "running" as const, events: turnEnded.events! }
        : ended(execution);
    },

    fail(execution: ExecutionRow, error: string) {
      table.fail(execution, { error });

      return ended(execution);
    },

    // The cron sweep.
    expire() {
      for (const execution of db.executions.values()) {
        if (
          execution.outcome === null &&
          execution.leaseExpiresAt <= clock.now
        ) {
          table.expire(execution, undefined);
        }
      }
    },

    view(taskId: string): TaskView {
      const task = lockTask(taskId);

      return {
        state: task.state,
        consecutiveFailures: task.consecutiveFailures,
        executions: task.executionIds.map((id) => {
          const { outcome, error, stoppedBy, usage } = db.executions.get(id)!;

          return { id, outcome, error, stoppedBy, usage };
        }),
      };
    },
  };
}
