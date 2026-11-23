import { taskEventTable, taskTable } from "@server/lib/db/schema";
import type { DispatcherName } from "@server/lib/executions/dispatcher.dto";
import { Execution } from "@server/lib/executions/execution.workflow";
import { update, Workflow } from "@workflow";
import type { Child } from "@workflow";

import type { TaskState } from "./task.dto";

const maxConsecutiveFailures = 3;

export class Task extends Workflow {
  state: TaskState = "idle";
  stateChangedAt = this.now;
  consecutiveFailures = 0;
  dispatcher!: DispatcherName;
  pending: string[] = [];
  awakened = false;
  execution?: Child<Execution>;

  async run() {
    await this.until(() => this.awakened);
    this.awakened = false;
    await this.attempt();

    return await this.continueAsNew();
  }

  receive(eventId: string, dispatcher: DispatcherName) {
    this.dispatcher = dispatcher;

    if (this.execution) {
      this.execution.receive(eventId);

      return;
    }

    this.pending.push(eventId);
    this.awakened = true;
  }

  stop(stoppedById: string) {
    this.execution?.stop(stoppedById);
  }

  executionClaimed() {
    this.become("running");
  }

  purgeable(cutoff: number) {
    return this.execution === undefined && this.stateChangedAt < cutoff;
  }

  override rows() {
    return [
      update(taskTable, {
        id: this.id,
        state: this.state,
        activeExecutionId: this.execution?.id ?? null,
        consecutiveFailures: this.consecutiveFailures,
        stateChangedAt: new Date(this.stateChangedAt),
      }),
      ...this.pending.map((eventId) =>
        update(taskEventTable, {
          taskId: this.id,
          eventId,
          state: "pending",
          executionId: null,
        })
      ),
    ];
  }

  private async attempt() {
    for (;;) {
      this.execution = this.start(Execution, this.pending, this.dispatcher);
      this.pending = [];
      this.become("queued");

      const { end, unfinished } = await this.execution.result;

      this.execution = undefined;
      this.pending = unfinished;

      if (end.outcome === "succeeded") {
        this.consecutiveFailures = 0;
        this.become("idle");

        return;
      }

      if (end.outcome === "stopped") {
        this.become("stopped");

        return;
      }

      this.consecutiveFailures += 1;

      if (this.pending.length === 0) {
        this.become("idle");

        return;
      }

      if (this.consecutiveFailures >= maxConsecutiveFailures) {
        this.become("blocked");

        return;
      }
    }
  }

  private become(state: TaskState) {
    if (state !== this.state) {
      this.state = state;
      this.stateChangedAt = this.now;
    }
  }
}
