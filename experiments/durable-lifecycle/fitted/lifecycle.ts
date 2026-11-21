import {
  claimTimeout,
  leaseDuration,
  maxConsecutiveFailures,
} from "../contract";
import type {
  ClaimAnswer,
  Deps,
  TaskEvent,
  TaskState,
  Usage,
} from "../contract";
import { Entity, Workflow } from "./platform";

export type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedBy: string };

export interface Outside {
  reads: Pick<Deps, "authenticateRunner" | "claimContext">;
  effects: Pick<Deps, "dispatch" | "release">;
}

interface Rest {
  // How the task rests when no execution is live.
  rest: Exclude<TaskState, "queued" | "running">;
  consecutiveFailures: number;
}

export class Task extends Entity<TaskEvent, Rest> {
  state: Rest = { rest: "idle", consecutiveFailures: 0 };

  private readonly execution = this.child(Execution, (end) =>
    this.executionEnded(end)
  );

  receive(event: TaskEvent) {
    const isNew = this.inbox.add(event);

    if (isNew && !this.execution.live) {
      this.execution.start();
    }
  }

  stop(userId: string) {
    this.execution.live?.stop(userId);
  }

  private executionEnded(end: End) {
    this.inbox.giveBack();
    this.afterExecution[end.outcome]();
  }

  private readonly afterExecution: Record<End["outcome"], () => void> = {
    succeeded: () => {
      this.state = { rest: "idle", consecutiveFailures: 0 };
    },
    stopped: () => {
      this.state.rest = "stopped";
    },
    failed: () => {
      this.state.consecutiveFailures += 1;

      if (this.state.consecutiveFailures < maxConsecutiveFailures) {
        this.execution.start();
      } else {
        this.state.rest = "blocked";
      }
    },
  };

  view() {
    return {
      state: this.execution.live?.state.phase ?? this.state.rest,
      consecutiveFailures: this.state.consecutiveFailures,
    };
  }
}

interface Progress {
  phase: "queued" | "running";
  usage?: Usage;
}

export class Execution extends Workflow<Task, Progress, End, Outside> {
  state: Progress = { phase: "queued" };

  protected override started() {
    this.effect("dispatch", [this.id], { rejected: "fail" });
  }

  protected override deadline() {
    return this.state.phase === "queued"
      ? {
          after: claimTimeout,
          expire: () =>
            this.fail(
              `No runner claimed the execution within ${claimTimeout / 60_000} minutes`
            ),
        }
      : {
          after: leaseDuration,
          expire: () => this.fail("The runner stopped responding"),
        };
  }

  async claim(identityToken: string): Promise<ClaimAnswer> {
    await this.read.authenticateRunner(this.id, identityToken);
    const context = await this.read.claimContext(this.parent.id);

    if (this.state.phase === "running") {
      return { claimed: false, outcome: null };
    }

    this.state.phase = "running";

    return { claimed: true, context };
  }

  pull(usage?: Usage) {
    this.keepUsage(usage);

    return this.parent.inbox.deliver();
  }

  endTurn(usage?: Usage) {
    this.keepUsage(usage);
    this.parent.inbox.acknowledge();
    const events = this.parent.inbox.deliver();

    return events.length > 0 ? events : this.end({ outcome: "succeeded" });
  }

  fail(error: string) {
    this.effect("release", [this.id]);

    return this.end({ outcome: "failed", error });
  }

  stop(userId: string) {
    this.effect("release", [this.id]);

    return this.end({ outcome: "stopped", stoppedBy: userId });
  }

  private keepUsage(usage: Usage | undefined) {
    this.state.usage = usage ?? this.state.usage;
  }
}
