import { maxConsecutiveFailures } from "./domain";
import type { RestingTaskState, TaskEvent, TaskState } from "./domain";
import { project, Workflow } from "./engine";
import type { Child } from "./engine";
import { Execution } from "./execution";
import { taskTable } from "./schema";

export class Task extends Workflow {
  state: TaskState = "idle";
  consecutiveFailures = 0;
  received = new Set<string>();
  inbox: TaskEvent[] = [];
  unfinished: TaskEvent[] = [];
  execution?: Child<Execution>;

  async run(): Promise<never> {
    for (;;) {
      await this.until(() => this.inbox.length > 0);
      this.state = await this.attempt();
    }
  }

  receive(event: TaskEvent) {
    if (this.received.has(event.id)) {
      return;
    }

    this.received.add(event.id);

    if (this.execution) {
      this.execution.deliver(event);
    } else {
      this.inbox.push(event);
    }
  }

  stop(userId: string) {
    this.execution?.stop(userId);
  }

  executionClaimed() {
    this.state = "running";
  }

  row() {
    return project(taskTable, {
      id: this.id,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
    });
  }

  private async attempt(): Promise<RestingTaskState> {
    for (;;) {
      const end = await this.execute();

      if (end.outcome === "succeeded") {
        this.consecutiveFailures = 0;

        return "idle";
      }

      if (end.outcome === "stopped") {
        return "stopped";
      }

      this.consecutiveFailures += 1;

      if (this.consecutiveFailures >= maxConsecutiveFailures) {
        return "blocked";
      }
    }
  }

  private async execute() {
    this.execution = this.start(Execution, [...this.unfinished, ...this.inbox]);
    this.inbox = [];
    this.state = "queued";

    const { end, unfinished } = await this.execution.result;

    this.execution = undefined;
    this.unfinished = unfinished;

    return end;
  }
}
