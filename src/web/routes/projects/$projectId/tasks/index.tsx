import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { TaskStateSchema } from "@server/lib/tasks/task.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import {
  ListFilter,
  ListNoResults,
  ListPagination,
  ListSearch,
  ListToolbar,
} from "@web/components/list-controls";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page, PageHeader } from "@web/components/ui/page";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { automationListQuery } from "@web/lib/automations/automation.queries";
import {
  listPageSize,
  listRouteSearch,
  searchFilters,
} from "@web/lib/lists/list.route";
import { TaskList } from "@web/lib/tasks/task-list";
import { TaskState, taskStates } from "@web/lib/tasks/task-state";
import { taskListQuery } from "@web/lib/tasks/task.queries";
import { TasksRouteSearch } from "@web/lib/tasks/task.route";
import { ListTodo } from "lucide-react";

const stateOptions = TaskStateSchema.options.map((value) => ({
  value,
  label: <TaskState state={value} />,
}));

export const Route = createFileRoute("/projects/$projectId/tasks/")({
  params: { parse: (params) => ProjectInfoParams.parse(params) },
  ...listRouteSearch(TasksRouteSearch),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(taskListQuery(params.projectId, deps)),
      context.dbClient.preloadLiveQuery(
        automationListQuery(params.projectId, "", true)
      ),
    ]),
  staticData: {
    description:
      "Tasks of a project, with their latest execution; searchable and filtered by state and automation.",
  },
  component: TasksPage,
});

function TasksPage() {
  const { projectId } = Route.useParams();
  const navigate = Route.useNavigate();
  const filters = Route.useSearch();
  const { search, state, automationId, offset } = filters;
  const { data } = useLiveSuspenseQuery(taskListQuery(projectId, filters));

  const { data: automations } = useLiveSuspenseQuery(
    automationListQuery(projectId, "", true)
  );

  const rows = data.slice(0, listPageSize);

  const automationName = automations.find(
    ({ automation }) => automation.id === automationId
  )?.automation.name;

  const activeFilters = [
    ...searchFilters(search),
    ...(state ? [`State: ${taskStates[state].label}`] : []),
    ...(automationId ? [`Automation: ${automationName ?? automationId}`] : []),
  ];

  const emptyState =
    activeFilters.length > 0 ? (
      <ListNoResults noun="tasks" filters={activeFilters} />
    ) : (
      <Empty variant="outline">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTodo aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No tasks yet</EmptyTitle>
          <EmptyDescription>
            An automation creates a task when an event matches its triggers.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <Page width="wide">
      <PageHeader
        title="Tasks"
        description="A task is one piece of work of an automation. Its agent moves it forward in one or more executions."
      />
      <ListToolbar>
        <ListSearch label="Search tasks" value={search} />
        <ListFilter
          label="State"
          value={state}
          options={stateOptions}
          onChange={(value) => {
            void navigate({
              search: (previous) => ({ ...previous, state: value, offset: 0 }),
            });
          }}
        />
        <ListFilter
          label="Automation"
          value={automationId}
          options={automations.map(({ automation }) => ({
            value: automation.id,
            label: (
              <>
                <AgentIcon agent={{ id: automation.agentId }} size="xs" />
                <span className="truncate">{automation.name}</span>
              </>
            ),
          }))}
          onChange={(value) => {
            void navigate({
              search: (previous) => ({
                ...previous,
                automationId: value,
                offset: 0,
              }),
            });
          }}
        />
      </ListToolbar>
      {rows.length === 0 ? (
        emptyState
      ) : (
        <TaskList projectId={projectId} rows={rows} />
      )}
      <ListPagination
        offset={offset}
        shown={rows.length}
        hasNext={data.length > listPageSize}
        noun={["task", "tasks"]}
      />
    </Page>
  );
}
