import { attemptState } from "@server/lib/executions/execution.dto";
import type { client } from "@web/lib/api";
import type { Execution } from "@web/lib/executions/execution.collection";
import type { InferResponseType } from "hono/client";

export type Task = InferResponseType<
  typeof client.api.tasks.$get,
  200
>["items"][number];

type Automation = InferResponseType<
  typeof client.api.automations.$get,
  200
>["items"][number];

type Agent = InferResponseType<
  typeof client.api.agents.$get,
  200
>["items"][number];

export const isActiveTask = ({ state }: Task) =>
  state === "queued" || state === "running";

export function activeExecution(executions: Execution[]) {
  return executions.find(({ outcome }) => outcome === null);
}

export interface TaskRow {
  task: Task;
  automation?: Pick<Automation, "id" | "name">;
  agent?: Pick<Agent, "id" | "name">;
  execution?: Execution;
}

export type ResourcePresentation = Task["associations"][number]["presentation"];

export function taskResourceLabel(presentation: ResourcePresentation) {
  return presentation.title
    ? `${presentation.label} · ${presentation.title}`
    : presentation.label;
}

export function taskTitle(task: Task) {
  return taskResourceLabel(task.associations[0]!.presentation);
}

const compactCount = new Intl.NumberFormat("en", { notation: "compact" });

// Keeps the cents, and two significant digits below them.
const usd = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 2,
  roundingPriority: "morePrecision",
});

export function durationLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m`;
  }

  return minutes > 0 ? `${minutes}m ${pad(seconds % 60)}s` : `${seconds}s`;
}

export function executionDuration(
  { queuedAt, startedAt, endedAt }: Execution,
  now: number
) {
  return (
    (endedAt ? Date.parse(endedAt) : now) - Date.parse(startedAt ?? queuedAt)
  );
}

export function executionActivity(execution: Execution, now: number) {
  const duration = durationLabel(executionDuration(execution, now));

  return {
    queued: "Queued",
    running: `Working for ${duration}`,
    succeeded: `Worked for ${duration}`,
    failed: `Failed after ${duration}`,
    stopped: `Stopped after ${duration}`,
  }[attemptState(execution)];
}

export function usageTokens({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens,
}: Omit<Execution["usage"], "cost">) {
  return inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
}

export const countLabel = (count: number) => compactCount.format(count);

export const tokensLabel = (tokens: number) => `${countLabel(tokens)} tokens`;

export const costLabel = (cost: number) => usd.format(cost);

export function executionUsage({ usage }: Execution) {
  const tokens = usageTokens(usage);

  if (tokens === 0) {
    return [];
  }

  return [
    tokensLabel(tokens),
    ...(usage.cost === null ? [] : [costLabel(usage.cost)]),
  ];
}

export function taskTotals(executions: Execution[], now: number) {
  return {
    duration: executions.reduce(
      (total, execution) => total + executionDuration(execution, now),
      0
    ),
    tokens: executions.reduce(
      (total, { usage }) => total + usageTokens(usage),
      0
    ),
    cost: executions.reduce((total, { usage }) => total + (usage.cost ?? 0), 0),
  };
}
