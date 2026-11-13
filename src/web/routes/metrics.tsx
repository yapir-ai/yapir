import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { ListFilter, ListToolbar } from "@web/components/list-controls";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { harnessOptions } from "@web/lib/agents/agent.options";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { automationListQuery } from "@web/lib/automations/automation.queries";
import { listRouteSearch } from "@web/lib/lists/list.route";
import { MetricsChart } from "@web/lib/metrics/metrics-chart";
import {
  dimensionLabels,
  metricsDimensions,
  rankGroups,
  sourceDimensions,
} from "@web/lib/metrics/metrics-dimension";
import { MetricsTable } from "@web/lib/metrics/metrics-table";
import type {
  EffectMetrics,
  ExecutionMetrics,
} from "@web/lib/metrics/metrics.collection";
import {
  effectMetricsCollection,
  executionMetricsCollection,
} from "@web/lib/metrics/metrics.collection";
import { browserTimeZone } from "@web/lib/metrics/metrics.presentation";
import {
  effectMetricsQuery,
  effectSeriesQueries,
  executionMetricsQuery,
  executionSeriesQueries,
} from "@web/lib/metrics/metrics.queries";
import { MetricsRouteSearch } from "@web/lib/metrics/metrics.route";
import type { MetricsSearch } from "@web/lib/metrics/metrics.route";
import { SectionCard } from "@web/lib/metrics/section-card";
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import { projectListQuery } from "@web/lib/projects/project.queries";
import {
  costLabel,
  countLabel,
  usageTokens,
} from "@web/lib/tasks/task.presentation";

const groupByOptions = metricsDimensions.map((value) => ({
  value,
  label: `By ${dimensionLabels[value].toLowerCase()}`,
}));

const intervalOptions = [
  { value: "day" as const, label: "Daily" },
  { value: "week" as const, label: "Weekly" },
];

function totalsParams({
  groupBy,
  interval: _interval,
  ...filters
}: MetricsSearch) {
  const dimensions = sourceDimensions(groupBy);

  return {
    executions: {
      ...filters,
      groupBy: dimensions.execution && [dimensions.execution],
    },
    effects: { ...filters, groupBy: dimensions.effect && [dimensions.effect] },
  };
}

function seriesQueries(
  { groupBy, interval, ...filters }: MetricsSearch,
  executionTotals: ExecutionMetrics[],
  effectTotals: EffectMetrics[]
) {
  const dimensions = sourceDimensions(groupBy);
  const periods = { ...filters, interval, timeZone: browserTimeZone };

  // A source without the dimension has a single Total row: it adds no group.
  const groups = rankGroups(
    groupBy,
    dimensions.execution || !groupBy ? executionTotals : [],
    dimensions.effect || !groupBy ? effectTotals : []
  );

  return {
    groups,
    executions: executionSeriesQueries(periods, dimensions.execution, groups),
    effects: effectSeriesQueries(periods, dimensions.effect, groups),
  };
}

const modelsQuery = executionMetricsQuery({ groupBy: ["model"] });

export const Route = createFileRoute("/metrics")({
  ...listRouteSearch(MetricsRouteSearch),
  loaderDeps: ({ search }) => search,
  // The charts query the groups that the totals rank first: the loader reads the totals before it preloads the charts.
  loader: async ({ context: { dbClient }, deps }) => {
    const totals = totalsParams(deps);

    const [executionTotals, effectTotals] = await Promise.all([
      dbClient
        .collection(executionMetricsCollection(totals.executions))
        .toArrayWhenReady(),
      dbClient
        .collection(effectMetricsCollection(totals.effects))
        .toArrayWhenReady(),
      dbClient.preloadLiveQuery(modelsQuery),
      dbClient.preloadLiveQuery(projectListQuery("", true)),
      dbClient.preloadLiveQuery(agentListQuery("", true)),
      dbClient.preloadLiveQuery(modelProviderListQuery("", true)),
      deps.projectId &&
        dbClient.preloadLiveQuery(
          automationListQuery(deps.projectId, "", true)
        ),
    ]);

    const { executions, effects } = seriesQueries(
      deps,
      executionTotals,
      effectTotals
    );

    await Promise.all(
      [executions.rows, executions.totals, effects.rows, effects.totals].map(
        async (options) => await dbClient.preloadLiveQuery(options)
      )
    );
  },
  staticData: {
    breadcrumb: "Metrics",
    description:
      "Metrics: the cost, executions, tokens and contributions of the last 30 days, filtered and grouped by project, automation, agent, model provider, model, harness, outcome or kind.",
  },
  component: MetricsPage,
});

function MetricsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { groupBy, interval } = search;
  const totals = totalsParams(search);

  const { data: executionTotals } = useLiveSuspenseQuery(
    executionMetricsQuery(totals.executions)
  );

  const { data: effectTotals } = useLiveSuspenseQuery(
    effectMetricsQuery(totals.effects)
  );

  const { data: models } = useLiveSuspenseQuery(modelsQuery);
  const { data: projects } = useLiveSuspenseQuery(projectListQuery("", true));
  const { data: agents } = useLiveSuspenseQuery(agentListQuery("", true));

  const { data: modelProviders } = useLiveSuspenseQuery(
    modelProviderListQuery("", true)
  );

  const filter = (patch: Partial<MetricsSearch>) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }) });
  };

  const dimensions = sourceDimensions(groupBy);
  const series = seriesQueries(search, executionTotals, effectTotals);

  const { data: executions } = useLiveSuspenseQuery(series.executions.rows);

  const { data: executionPeriods } = useLiveSuspenseQuery(
    series.executions.totals
  );

  const { data: effects } = useLiveSuspenseQuery(series.effects.rows);
  const { data: effectPeriods } = useLiveSuspenseQuery(series.effects.totals);

  return (
    <Page width="wide">
      <PageHeader
        title="Metrics"
        description="The executions of the last 30 days and the contributions of their agents: pull requests, reviews, comments and commits."
      />
      <ListToolbar>
        <ListFilter
          label="Project"
          value={search.projectId}
          options={projects.map(({ id, name }) => ({
            value: id,
            label: (
              <>
                <ProjectIcon project={{ id }} size="xs" />
                <span className="truncate">{name}</span>
              </>
            ),
          }))}
          onChange={(projectId) => {
            filter({ projectId, automationId: undefined });
          }}
        />
        {search.projectId && (
          <AutomationFilter
            projectId={search.projectId}
            value={search.automationId}
            onChange={(automationId) => {
              filter({ automationId });
            }}
          />
        )}
        <ListFilter
          label="Agent"
          value={search.agentId}
          options={agents.map(({ id, name }) => ({
            value: id,
            label: (
              <>
                <AgentIcon agent={{ id }} size="xs" />
                <span className="truncate">{name}</span>
              </>
            ),
          }))}
          onChange={(agentId) => {
            filter({ agentId });
          }}
        />
        <ListFilter
          label="Model provider"
          value={search.modelProviderId}
          options={modelProviders.map(({ id, name, catalogId }) => ({
            value: id,
            label: (
              <>
                <ModelProviderIcon catalogId={catalogId} size="xs" />
                <span className="truncate">{name}</span>
              </>
            ),
          }))}
          onChange={(modelProviderId) => {
            filter({ modelProviderId });
          }}
        />
        <ListFilter
          label="Model"
          value={search.model}
          options={models.flatMap(({ model }) =>
            model ? [{ value: model, label: model }] : []
          )}
          onChange={(model) => {
            filter({ model });
          }}
        />
        <ListFilter
          label="Harness"
          value={search.harness}
          options={harnessOptions.map(({ value, label, icon }) => ({
            value,
            label: (
              <>
                {icon}
                {label}
              </>
            ),
          }))}
          onChange={(harness) => {
            filter({ harness });
          }}
        />
        <ListFilter
          label="Group by"
          value={groupBy}
          options={groupByOptions}
          onChange={(value) => {
            filter({ groupBy: value });
          }}
        />
        <Select
          items={intervalOptions}
          value={interval}
          onValueChange={(value) => {
            filter({ interval: value ?? "day" });
          }}
        >
          <SelectTrigger aria-label="Interval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {intervalOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListToolbar>
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Cost">
          <MetricsChart
            rows={executions}
            totals={executionPeriods}
            measure={(row) => row.cost}
            dimension={dimensions.execution}
            interval={interval}
            groups={series.groups}
            format={costLabel}
            allowDecimals
          />
        </SectionCard>
        <SectionCard title="Executions">
          <MetricsChart
            rows={executions}
            totals={executionPeriods}
            measure={(row) => row.executions}
            dimension={dimensions.execution}
            interval={interval}
            groups={series.groups}
            format={countLabel}
          />
        </SectionCard>
        <SectionCard title="Tokens">
          <MetricsChart
            rows={executions}
            totals={executionPeriods}
            measure={usageTokens}
            dimension={dimensions.execution}
            interval={interval}
            groups={series.groups}
            format={countLabel}
          />
        </SectionCard>
        <SectionCard
          title="Contributions"
          description="The pull requests, merge requests, reviews, comments, assignments and commits that agents made."
        >
          <MetricsChart
            rows={effects}
            totals={effectPeriods}
            measure={(row) => row.effects}
            dimension={dimensions.effect}
            interval={interval}
            groups={series.groups}
            format={countLabel}
          />
        </SectionCard>
      </div>
      <MetricsTable
        dimension={groupBy}
        groups={series.groups}
        executions={executionTotals}
        effects={effectTotals}
      />
    </Page>
  );
}

function AutomationFilter({
  projectId,
  value,
  onChange,
}: {
  projectId: string;
  value?: string;
  onChange: (automationId?: string) => void;
}) {
  const { data: automations } = useLiveSuspenseQuery(
    automationListQuery(projectId, "", true)
  );

  return (
    <ListFilter
      label="Automation"
      value={value}
      options={automations.map(({ automation }) => ({
        value: automation.id,
        label: (
          <>
            <AgentIcon agent={{ id: automation.agentId }} size="xs" />
            <span className="truncate">{automation.name}</span>
          </>
        ),
      }))}
      onChange={onChange}
    />
  );
}
