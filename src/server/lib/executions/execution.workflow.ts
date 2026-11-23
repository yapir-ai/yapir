import { executionTable, taskEventTable } from "@server/lib/db/schema";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { TaskEventState } from "@server/lib/events/task-event.dto";
import type { Task } from "@server/lib/tasks/task.workflow";
import { inject, update, upsert, Workflow } from "@workflow";

import type { DispatcherName } from "./dispatcher.dto";
import { executionDispatchActivity } from "./execution-dispatch.activity";
import { claimTimeout, leaseDuration } from "./execution-lease";
import { executionReleaseActivity } from "./execution-release.activity";
import type { UsageColumns } from "./execution-usage";

type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedById: string };

export type Ended = End & { endedAt: number };

export type AgentSnapshot = Pick<
  ExecutionSelect,
  "agentId" | "modelProviderId" | "model" | "effort" | "harness"
>;

export interface Claim {
  tokenHash: string;
  agent: AgentSnapshot;
}

const unclaimed: AgentSnapshot = {
  agentId: null,
  modelProviderId: null,
  model: null,
  effort: null,
  harness: null,
};

export class Execution extends Workflow<Task> {
  dispatcher!: DispatcherName;
  queuedAt = this.now;
  leaseExpiresAt = this.now + claimTimeout;
  waiting: string[] = [];
  turn: string[] = [];
  acknowledged: string[] = [];
  claimed?: Claim & { startedAt: number };
  usage: UsageColumns = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost: 0,
  };
  end?: Ended;

  private readonly dispatch = inject(executionDispatchActivity);
  private readonly release = inject(executionReleaseActivity);

  async run(events: string[], dispatcher: DispatcherName) {
    this.waiting = events;
    this.dispatcher = dispatcher;
    this.dispatch(this.id, this.parent.id, dispatcher);

    await this.until(() => this.end !== undefined, {
      deadline: () => this.leaseExpiresAt,
    });

    const end =
      this.end ?? this.finish({ outcome: "failed", error: this.leaseError() });

    if (end.outcome !== "succeeded") {
      this.release(this.id, dispatcher);
    }

    const unfinished = [...this.turn, ...this.waiting];
    this.turn = [];
    this.waiting = [];

    return { end, unfinished };
  }

  claim(claim: Claim) {
    if (this.claimed || this.end) {
      return { claimed: false as const, outcome: this.end?.outcome ?? null };
    }

    this.claimed = { ...claim, startedAt: this.now };
    this.leaseExpiresAt = this.now + leaseDuration;
    this.parent.executionClaimed();

    return { claimed: true as const };
  }

  pull(usage?: UsageColumns) {
    if (this.end) {
      return { end: this.end.outcome };
    }

    this.renew(usage);

    return { events: this.deliver() };
  }

  endTurn(usage?: UsageColumns) {
    if (this.end) {
      return { end: this.end.outcome };
    }

    this.renew(usage);
    this.acknowledged.push(...this.turn);
    this.turn = [];

    return this.waiting.length > 0
      ? { events: this.deliver() }
      : { end: this.finish({ outcome: "succeeded" }).outcome };
  }

  fail(error: string) {
    return { end: this.finish({ outcome: "failed", error }).outcome };
  }

  stop(stoppedById: string) {
    this.finish({ outcome: "stopped", stoppedById });
  }

  receive(eventId: string) {
    this.waiting.push(eventId);
  }

  override rows() {
    const taskId = this.parent.id;

    const event = (eventId: string, state: TaskEventState) =>
      update(taskEventTable, {
        taskId,
        eventId,
        state,
        executionId: state === "pending" ? null : this.id,
      });

    return [
      upsert(executionTable, {
        id: this.id,
        taskId,
        outcome: this.end?.outcome ?? null,
        dispatcher: this.dispatcher,
        tokenHash: this.claimed?.tokenHash ?? null,
        leaseExpiresAt: new Date(this.leaseExpiresAt),
        queuedAt: new Date(this.queuedAt),
        startedAt: this.claimed ? new Date(this.claimed.startedAt) : null,
        endedAt: this.end ? new Date(this.end.endedAt) : null,
        stoppedById:
          this.end?.outcome === "stopped" ? this.end.stoppedById : null,
        error: this.end?.outcome === "failed" ? this.end.error : null,
        ...(this.claimed?.agent ?? unclaimed),
        ...this.usage,
      }),
      ...this.waiting.map((eventId) => event(eventId, "pending")),
      ...this.turn.map((eventId) => event(eventId, "delivered")),
      ...this.acknowledged.map((eventId) => event(eventId, "acknowledged")),
    ];
  }

  private renew(usage?: UsageColumns) {
    this.usage = usage ?? this.usage;
    this.leaseExpiresAt = this.now + leaseDuration;
  }

  private deliver() {
    const events = this.waiting;
    this.turn.push(...events);
    this.waiting = [];

    return events;
  }

  private finish(end: End) {
    this.end ??= { ...end, endedAt: this.now };

    return this.end;
  }

  private leaseError() {
    return this.claimed
      ? "The runner stopped responding"
      : `No runner claimed the execution within ${claimTimeout / 60_000} minutes`;
  }
}
