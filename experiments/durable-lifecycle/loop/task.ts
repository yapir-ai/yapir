import { maxConsecutiveFailures } from "../contract";
import type { Deps, Outcome, TaskEvent, TaskState } from "../contract";
import { Execution } from "./execution";
import { Entity } from "./platform";
import type { Child } from "./platform";

type Rest = Exclude<TaskState, "queued" | "running">;

const restAfter: Record<Outcome, Rest> = {
  succeeded: "idle",
  failed: "blocked",
  stopped: "stopped",
};

export class Task extends Entity<Deps> {
  consecutiveFailures = 0;

  private rest: Rest = "idle";
  private execution?: Child<Execution>;
  private readonly received = new Set<string>();
  private inbox: TaskEvent[] = [];
  private unfinished: TaskEvent[] = [];

  get state(): TaskState {
    if (!this.execution) {
      return this.rest;
    }

    return this.execution.claimed ? "running" : "queued";
  }

  async run() {
    await this.until(() => this.inbox.length > 0);

    let outcome = await this.execute();

    while (
      outcome === "failed" &&
      this.consecutiveFailures < maxConsecutiveFailures
    ) {
      outcome = await this.execute();
    }

    this.rest = restAfter[outcome];
  }

  receive(event: TaskEvent) {
    if (this.received.has(event.id)) {
      return;
    }

    this.received.add(event.id);

    if (this.execution) {
      this.execution.add(event);
    } else {
      this.inbox.push(event);
    }
  }

  stop(userId: string) {
    this.execution?.stop(userId);
  }

  // The unfinished events of the last execution go first: the task received them first.
  private async execute() {
    this.execution = this.start(Execution, {
      taskId: this.id,
      events: [...this.unfinished, ...this.inbox],
    });
    this.inbox = [];

    const { outcome, unfinished } = await this.execution.result;

    this.execution = undefined;
    this.unfinished = unfinished;
    this.count(outcome);

    return outcome;
  }

  private count(outcome: Outcome) {
    if (outcome === "succeeded") {
      this.consecutiveFailures = 0;
    }

    if (outcome === "failed") {
      this.consecutiveFailures += 1;
    }
  }
}
