import { ExecutionOutcomeSchema } from "@server/lib/executions/execution.dto";
import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { effectMetricsDimensions } from "@server/lib/metrics/effect-metrics.dto";
import { executionMetricsDimensions } from "@server/lib/metrics/execution-metrics.dto";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Code } from "@web/components/ui/code";
import { Link } from "@web/components/ui/link";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { harnessOptions } from "@web/lib/agents/agent.options";
import { agentInfoQuery } from "@web/lib/agents/agent.queries";
import { HarnessLabel } from "@web/lib/agents/harness-label";
import { accessibleAutomationsCollection } from "@web/lib/automations/automation.collection";
import { query } from "@web/lib/db/query";
import {
  ExecutionState,
  executionStates,
} from "@web/lib/executions/execution-state";
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";
import { modelProviderInfoQuery } from "@web/lib/model-providers/model-provider.queries";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { effectKinds } from "@web/lib/tasks/effect-kind";
import type { ReactNode } from "react";

import type { EffectMetrics, ExecutionMetrics } from "./metrics.collection";

export type ExecutionMetricsDimension =
  (typeof executionMetricsDimensions)[number];

export type EffectMetricsDimension = (typeof effectMetricsDimensions)[number];

export type MetricsDimension =
  | ExecutionMetricsDimension
  | EffectMetricsDimension;

export const metricsDimensions = [
  ...new Set([...executionMetricsDimensions, ...effectMetricsDimensions]),
];

export const dimensionLabels: Record<MetricsDimension, string> = {
  projectId: "Project",
  automationId: "Automation",
  agentId: "Agent",
  modelProviderId: "Model provider",
  model: "Model",
  harness: "Harness",
  outcome: "Outcome",
  kind: "Kind",
};

export type MetricsGroupRow = Partial<
  Record<MetricsDimension, string | null>
> & {
  date?: string;
};

export const groupOf = (row: MetricsGroupRow, dimension?: MetricsDimension) =>
  dimension ? (row[dimension] ?? null) : null;

function rankBy<T extends MetricsGroupRow>(
  rows: T[],
  dimension: MetricsDimension | undefined,
  measure: (row: T) => number
) {
  const totals = new Map<string | null, number>();

  for (const row of rows) {
    const group = groupOf(row, dimension);
    totals.set(group, (totals.get(group) ?? 0) + measure(row));
  }

  return [...totals.keys()].toSorted((a, b) => totals.get(b)! - totals.get(a)!);
}

// The groups rank by cost, then by contributions: a group keeps its rank, and so its color, in every chart.
export const rankGroups = (
  dimension: MetricsDimension | undefined,
  executions: ExecutionMetrics[],
  effects: EffectMetrics[]
) => [
  ...new Set([
    ...rankBy(executions, dimension, (row) => row.cost),
    ...rankBy(effects, dimension, (row) => row.effects),
  ]),
];

const harnessLabels = Object.fromEntries(
  harnessOptions.map(({ value, label }) => [value, label])
);

const outcomeLabels = Object.fromEntries(
  ExecutionOutcomeSchema.options.map((outcome) => [
    outcome,
    executionStates[outcome].label,
  ])
);

const isExecutionDimension = (
  dimension: MetricsDimension
): dimension is ExecutionMetricsDimension =>
  executionMetricsDimensions.some((candidate) => candidate === dimension);

const isEffectDimension = (
  dimension: MetricsDimension
): dimension is EffectMetricsDimension =>
  effectMetricsDimensions.some((candidate) => candidate === dimension);

export const sourceDimensions = (groupBy?: MetricsDimension) => ({
  execution: groupBy && isExecutionDimension(groupBy) ? groupBy : undefined,
  effect: groupBy && isEffectDimension(groupBy) ? groupBy : undefined,
});

const dimensionValues: Record<
  MetricsDimension,
  (value: string, plain: boolean) => ReactNode
> = {
  projectId: (value, plain) => <ProjectName projectId={value} plain={plain} />,
  automationId: (value, plain) => (
    <AutomationName automationId={value} plain={plain} />
  ),
  agentId: (value, plain) => <AgentName agentId={value} plain={plain} />,
  modelProviderId: (value, plain) => (
    <ModelProviderName modelProviderId={value} plain={plain} />
  ),
  model: (value, plain) => (plain ? value : <Code>{value}</Code>),
  harness: (value, plain) =>
    plain ? (
      harnessLabels[value]
    ) : (
      <HarnessLabel harness={HarnessNameSchema.parse(value)} />
    ),
  outcome: (value, plain) =>
    plain ? (
      outcomeLabels[value]
    ) : (
      <ExecutionState state={ExecutionOutcomeSchema.parse(value)} />
    ),
  kind: (value) => effectKinds.get(value)?.label ?? value,
};

const nullLabels: Partial<Record<MetricsDimension, string>> = {
  outcome: "In progress",
};

export function DimensionValue({
  dimension,
  value,
  plain = false,
}: {
  dimension: MetricsDimension;
  value: string | null;
  plain?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {value === null
        ? (nullLabels[dimension] ?? "None")
        : dimensionValues[dimension](value, plain)}
    </span>
  );
}

function ProjectName({
  projectId,
  plain,
}: {
  projectId: string;
  plain: boolean;
}) {
  const name = useLiveQuery(projectInfoQuery(projectId)).data?.name;

  return plain ? (
    name
  ) : (
    <>
      <ProjectIcon project={{ id: projectId }} size="xs" />
      <Link to="/projects/$projectId" params={{ projectId }}>
        {name}
      </Link>
    </>
  );
}

function AgentName({ agentId, plain }: { agentId: string; plain: boolean }) {
  const name = useLiveQuery(agentInfoQuery(agentId)).data?.name;

  return plain ? (
    name
  ) : (
    <>
      <AgentIcon agent={{ id: agentId }} size="xs" />
      <Link to="/agents/$agentId" params={{ agentId }}>
        {name}
      </Link>
    </>
  );
}

function ModelProviderName({
  modelProviderId,
  plain,
}: {
  modelProviderId: string;
  plain: boolean;
}) {
  const modelProvider = useLiveQuery(
    modelProviderInfoQuery(modelProviderId)
  ).data;

  return plain
    ? modelProvider?.name
    : modelProvider && (
        <>
          <ModelProviderIcon catalogId={modelProvider.catalogId} size="xs" />
          <Link
            to="/model-providers/$modelProviderId"
            params={{ modelProviderId }}
          >
            {modelProvider.name}
          </Link>
        </>
      );
}

function AutomationName({
  automationId,
  plain,
}: {
  automationId: string;
  plain: boolean;
}) {
  const { data } = useLiveQuery(
    query((q) =>
      q
        .from({ automation: accessibleAutomationsCollection })
        .where(({ automation }) => eq(automation.id, automationId))
        .findOne()
    )
  );

  return plain
    ? data?.name
    : data && (
        <>
          <AgentIcon agent={{ id: data.agentId }} size="xs" />
          <Link
            to="/projects/$projectId/automations/$automationId"
            params={{ projectId: data.projectId, automationId }}
          >
            {data.name}
          </Link>
        </>
      );
}
