import {
  claimTimeout,
  leaseDuration,
  maxConsecutiveFailures,
} from "../contract";
import type { Deps, TaskEvent, TaskState, Usage } from "../contract";
import { durable } from "./platform";

const { Entity, Workflow } = durable<Deps>();

export type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedBy: string };

export class Task extends Entity<Task> {
  state: TaskState = "idle";
  consecutiveFailures = 0;
  // The events that no execution holds.
  pending: TaskEvent[] = [];
  received: string[] = [];
  execution?: Execution;

  receive(event: TaskEvent) {
    if (this.received.includes(event.id)) {
      return;
    }

    this.received.push(event.id);

    if (this.execution) {
      this.execution.deliver(event);
    } else {
      this.pending.push(event);
      this.startExecution();
    }
  }

  stop(userId: string) {
    this.execution?.stop(userId);
  }

  executionClaimed() {
    this.state = "running";
  }

  executionEnded(end: End, unfinished: TaskEvent[]) {
    this.execution = undefined;
    this.pending = unfinished;

    const rules: Record<End["outcome"], () => void> = {
      succeeded: () => {
        this.state = "idle";
        this.consecutiveFailures = 0;
      },
      stopped: () => {
        this.state = "stopped";
      },
      failed: () => {
        this.consecutiveFailures += 1;

        if (this.consecutiveFailures < maxConsecutiveFailures) {
          this.startExecution();
        } else {
          this.state = "blocked";
        }
      },
    };

    rules[end.outcome]();
  }

  private startExecution() {
    this.execution = this.start(Execution, this.pending);
    this.pending = [];
    this.state = "queued";
  }
}

export class Execution extends Workflow<Execution, Task, End> {
  // Given by the task, not pulled yet.
  waiting: TaskEvent[];
  // Pulled during the current turn, which its end acknowledges.
  turn: TaskEvent[] = [];
  claimed = false;
  usage?: Usage;

  constructor(events: TaskEvent[]) {
    super();
    this.waiting = events;
    this.outside.dispatch(this.id).onError("fail");
    this.after(claimTimeout).fail(
      `No runner claimed the execution within ${claimTimeout / 60_000} minutes`
    );
  }

  claim() {
    if (this.claimed) {
      return false;
    }

    this.claimed = true;
    this.parent.executionClaimed();
    this.heardFromRunner();

    return true;
  }

  pull(usage?: Usage) {
    this.heardFromRunner(usage);

    return this.nextEvents();
  }

  endTurn(usage?: Usage) {
    this.heardFromRunner(usage);
    this.turn = [];

    return this.waiting.length > 0
      ? this.nextEvents()
      : this.finish({ outcome: "succeeded" });
  }

  fail(error: string) {
    this.outside.release(this.id);

    return this.finish({ outcome: "failed", error });
  }

  stop(userId: string) {
    this.outside.release(this.id);

    return this.finish({ outcome: "stopped", stoppedBy: userId });
  }

  deliver(event: TaskEvent) {
    this.waiting.push(event);
  }

  private heardFromRunner(usage?: Usage) {
    this.usage = usage ?? this.usage;
    this.after(leaseDuration).fail("The runner stopped responding");
  }

  private nextEvents() {
    const events = this.waiting;
    this.turn.push(...events);
    this.waiting = [];

    return events;
  }

  private finish(end: End) {
    this.parent.executionEnded(end, [...this.turn, ...this.waiting]);

    return this.end(end);
  }
}
