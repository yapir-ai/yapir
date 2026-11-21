import { claimTimeout, leaseDuration } from "../contract";
import type {
  ClaimAnswer,
  Deps,
  Outcome,
  TaskEvent,
  TurnAnswer,
  Usage,
} from "../contract";
import { Workflow } from "./platform";

type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedBy: string };

interface Input {
  taskId: string;
  events: TaskEvent[];
}

interface Result {
  outcome: Outcome;
  unfinished: TaskEvent[];
}

export class Execution extends Workflow<Input, Result, Deps> {
  claimed = false;
  end?: End;
  usage?: Usage;

  private waiting = this.input.events;
  private turn: TaskEvent[] = [];
  private heartbeats = 0;

  async run() {
    await this.outside
      .dispatch(this.id)
      .catch((error: Error) => this.finish(failed(error.message)));

    await this.expect(
      () => this.claimed,
      claimTimeout,
      `No runner claimed the execution within ${claimTimeout / 60_000} minutes`
    );

    while (!this.end) {
      const heard = this.heartbeats;

      await this.expect(
        () => this.heartbeats > heard,
        leaseDuration,
        "The runner stopped responding"
      );
    }

    const { outcome } = this.end;

    if (outcome !== "succeeded") {
      // Not awaited: the task goes on while the execution environment stops.
      void this.outside.release(this.id);
    }

    return { outcome, unfinished: [...this.turn, ...this.waiting] };
  }

  // The messages of the task.

  add(event: TaskEvent) {
    this.waiting.push(event);
  }

  stop(userId: string) {
    this.finish({ outcome: "stopped", stoppedBy: userId });
  }

  // The messages of the runner.

  async claim(identityToken: string): Promise<ClaimAnswer> {
    await this.outside.authenticateRunner(this.id, identityToken);
    const context = await this.outside.claimContext(this.input.taskId);

    if (this.claimed || this.end) {
      return { claimed: false, outcome: this.end?.outcome ?? null };
    }

    this.claimed = true;

    return { claimed: true, context };
  }

  pull(usage?: Usage): TurnAnswer {
    if (this.end) {
      return { attempt: this.end.outcome };
    }

    this.heartbeat(usage);

    return { attempt: "running", events: this.deliver() };
  }

  endTurn(usage?: Usage): TurnAnswer {
    if (this.end) {
      return { attempt: this.end.outcome };
    }

    this.heartbeat(usage);
    this.turn = [];

    if (this.waiting.length === 0) {
      return { attempt: this.finish({ outcome: "succeeded" }).outcome };
    }

    return { attempt: "running", events: this.deliver() };
  }

  fail(error: string) {
    return { attempt: this.finish(failed(error)).outcome };
  }

  private async expect(happened: () => boolean, within: number, error: string) {
    const inTime = await this.until(
      () => happened() || this.end !== undefined,
      within
    );

    if (!inTime) {
      this.finish(failed(error));
    }
  }

  // The first end stands: an execution ends once.
  private finish(end: End) {
    this.end ??= end;

    return this.end;
  }

  private heartbeat(usage?: Usage) {
    this.heartbeats += 1;
    this.usage = usage ?? this.usage;
  }

  private deliver() {
    const events = this.waiting;
    this.turn.push(...events);
    this.waiting = [];

    return events;
  }
}

const failed = (error: string): End => ({ outcome: "failed", error });
