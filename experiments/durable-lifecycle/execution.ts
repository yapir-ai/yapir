import { claimTimeout, leaseDuration } from "./domain";
import type { End, TaskEvent, Usage } from "./domain";
import { inject, project, Workflow } from "./engine";
import { dispatchOperation, releaseOperation } from "./operations";
import { executionTable } from "./schema";
import type { Task } from "./task";

export class Execution extends Workflow<Task> {
  waiting: TaskEvent[] = [];
  turn: TaskEvent[] = [];
  claimed = false;
  leaseExpiresAt = this.now + claimTimeout;
  usage?: Usage;
  end?: End;

  private readonly dispatch = inject(dispatchOperation);
  private readonly release = inject(releaseOperation);

  async run(events: TaskEvent[]) {
    this.waiting = events;

    try {
      await this.dispatch(this.id);
    } catch (error) {
      this.fail(String(error));
    }

    await this.until(() => this.end !== undefined, {
      deadline: () => this.leaseExpiresAt,
    });

    const end = this.finish({
      outcome: "failed",
      error: this.claimed
        ? "The runner stopped responding"
        : `No runner claimed the execution within ${claimTimeout / 60_000} minutes`,
    });

    if (end.outcome !== "succeeded") {
      await this.release(this.id);
    }

    return { end, unfinished: [...this.turn, ...this.waiting] };
  }

  claim() {
    if (this.claimed || this.end) {
      return false;
    }

    this.claimed = true;
    this.renewLease();
    this.parent.executionClaimed();

    return true;
  }

  pull(usage?: Usage) {
    if (this.end) {
      return { end: this.end };
    }

    this.renewLease(usage);

    return { events: this.nextEvents() };
  }

  endTurn(usage?: Usage) {
    if (this.end) {
      return { end: this.end };
    }

    this.renewLease(usage);
    this.turn = [];

    return this.waiting.length > 0
      ? { events: this.nextEvents() }
      : { end: this.finish({ outcome: "succeeded" }) };
  }

  fail(error: string) {
    return { end: this.finish({ outcome: "failed", error }) };
  }

  stop(userId: string) {
    this.finish({ outcome: "stopped", stoppedBy: userId });
  }

  deliver(event: TaskEvent) {
    this.waiting.push(event);
  }

  row() {
    return project(executionTable, {
      id: this.id,
      taskId: this.parent.id,
      outcome: this.end?.outcome,
      ...this.usage,
    });
  }

  private renewLease(usage?: Usage) {
    this.usage = usage ?? this.usage;
    this.leaseExpiresAt = this.now + leaseDuration;
  }

  private nextEvents() {
    const events = this.waiting;
    this.turn.push(...events);
    this.waiting = [];

    return events;
  }

  private finish(end: End) {
    this.end ??= end;

    return this.end;
  }
}
