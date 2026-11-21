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
  TurnAnswer,
  Usage,
} from "../contract";
import { Entity } from "./platform";

type TaskPhase =
  | { state: Exclude<TaskState, "queued" | "running"> }
  | { state: "queued" | "running"; execution: string };

export class Task extends Entity<Task, Deps> {
  phase: TaskPhase = { state: "idle" };
  consecutiveFailures = 0;
  // The events that no execution holds.
  pending: TaskEvent[] = [];
  received: string[] = [];
  executions: string[] = [];

  receive(event: TaskEvent) {
    if (this.received.includes(event.id)) {
      return;
    }

    this.received.push(event.id);
    this.handOver(event);
  }

  stop(userId: string) {
    if ("execution" in this.phase) {
      this.send(Execution, this.phase.execution).stop(userId);
    }
  }

  executionClaimed(execution: string) {
    this.phase = { state: "running", execution };
  }

  executionSucceeded() {
    this.phase = { state: "idle" };
    this.consecutiveFailures = 0;
  }

  executionStopped(unfinished: TaskEvent[]) {
    this.phase = { state: "stopped" };
    this.pending = unfinished;
  }

  executionFailed(unfinished: TaskEvent[]) {
    this.pending = unfinished;
    this.consecutiveFailures += 1;

    if (this.consecutiveFailures < maxConsecutiveFailures) {
      this.startExecution();
    } else {
      this.phase = { state: "blocked" };
    }
  }

  // The execution ended before the event reached it.
  eventUndelivered(event: TaskEvent) {
    this.handOver(event);
  }

  private handOver(event: TaskEvent) {
    if ("execution" in this.phase) {
      this.send(Execution, this.phase.execution).deliver(event);
    } else {
      this.pending.push(event);
      this.startExecution();
    }
  }

  private startExecution() {
    const execution = this.create(Execution, this.id, this.pending);
    this.executions.push(execution);
    this.pending = [];
    this.phase = { state: "queued", execution };
  }
}

export class Execution extends Entity<Execution, Deps> {
  taskId: string;
  // Delivered by the task, not pulled yet.
  waiting: TaskEvent[];
  // Pulled during the current turn, which its end acknowledges.
  turn: TaskEvent[] = [];
  claimed = false;
  outcome: Outcome | null = null;
  error?: string;
  stoppedBy?: string;
  usage?: Usage;

  constructor(taskId: string, events: TaskEvent[]) {
    super();
    this.taskId = taskId;
    this.waiting = events;
    this.outside.dispatch(this.id).onError("fail");
    this.after(claimTimeout).fail(
      "No runner claimed the execution within 10 minutes"
    );
  }

  claim() {
    if (this.claimed || this.outcome) {
      return { claimed: false as const, outcome: this.outcome };
    }

    this.claimed = true;
    this.heardFromRunner();
    this.send(Task, this.taskId).executionClaimed(this.id);

    return { claimed: true as const };
  }

  pull(usage?: Usage): TurnAnswer {
    if (this.outcome) {
      return { attempt: this.outcome };
    }

    this.heardFromRunner(usage);

    return this.continueTurn();
  }

  endTurn(usage?: Usage): TurnAnswer {
    if (this.outcome) {
      return { attempt: this.outcome };
    }

    this.heardFromRunner(usage);
    this.turn = [];

    if (this.waiting.length > 0) {
      return this.continueTurn();
    }

    this.send(Task, this.taskId).executionSucceeded();

    return this.end("succeeded");
  }

  fail(error: string) {
    if (this.outcome) {
      return { attempt: this.outcome };
    }

    this.error = error;
    this.send(Task, this.taskId).executionFailed(this.abandon());

    return this.end("failed");
  }

  stop(userId: string) {
    if (this.outcome) {
      return;
    }

    this.stoppedBy = userId;
    this.send(Task, this.taskId).executionStopped(this.abandon());
    this.end("stopped");
  }

  deliver(event: TaskEvent) {
    if (this.outcome) {
      this.send(Task, this.taskId).eventUndelivered(event);
    } else {
      this.waiting.push(event);
    }
  }

  private heardFromRunner(usage?: Usage) {
    this.usage = usage ?? this.usage;
    this.after(leaseDuration).fail("The runner stopped responding");
  }

  private continueTurn(): TurnAnswer {
    const events = this.waiting;
    this.turn.push(...events);
    this.waiting = [];

    return { attempt: "running", events };
  }

  // A runner that succeeds exits by itself: only an abandoned environment needs a release.
  private abandon() {
    this.outside.release(this.id);

    return [...this.turn, ...this.waiting];
  }

  private end(outcome: Outcome) {
    this.outcome = outcome;

    return { attempt: outcome };
  }
}
