import type { AgentResponseDto } from "@server/lib/agents/agent.dto";
import { attemptState } from "@server/lib/executions/execution.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { Empty, EmptyHeader, EmptyTitle } from "@web/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemMedia,
  ItemTitle,
} from "@web/components/ui/item";
import { PageSection } from "@web/components/ui/page";
import { useNow } from "@web/hooks/use-now";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import {
  ExecutionStamp,
  ExecutionState,
} from "@web/lib/executions/execution-state";
import type { Execution } from "@web/lib/executions/execution.collection";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import type { Project } from "@web/lib/projects/project.collection";
import { TaskStopButton } from "@web/lib/tasks/task-stop-button";
import { executionActivity, taskTitle } from "@web/lib/tasks/task.presentation";
import type { Task } from "@web/lib/tasks/task.presentation";
import type { ReactNode } from "react";

import { needsAttentionQuery, runningNowQuery } from "./activity.queries";

export function ExecutionActivity({ projectId }: { projectId?: string }) {
  const { data: running } = useLiveSuspenseQuery(runningNowQuery(projectId));
  const { data: failed } = useLiveSuspenseQuery(needsAttentionQuery(projectId));

  if (running.length === 0 && failed.length === 0) {
    return (
      <Empty size="sm" className="flex-none">
        <EmptyHeader>
          <EmptyTitle>No task failed, and no agent is working.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      {running.length > 0 && (
        <PageSection title="Running">
          <ItemGroup aria-label="Running executions">
            {running.map(
              ({ execution, task, agent, project }) =>
                task &&
                agent &&
                project && (
                  <div
                    key={execution.id}
                    role="listitem"
                    className="flex items-center gap-2"
                  >
                    <TaskItem
                      task={task}
                      agent={agent}
                      project={project}
                      showProject={!projectId}
                    >
                      <RunningState execution={execution} />
                    </TaskItem>
                    <StopAction execution={execution} projectId={project.id} />
                  </div>
                )
            )}
          </ItemGroup>
        </PageSection>
      )}
      {failed.length > 0 && (
        <PageSection title="Failed">
          <ItemGroup aria-label="Failed tasks">
            {failed.map(
              ({ execution, task, agent, project }) =>
                task &&
                agent &&
                project && (
                  <div key={execution.id} role="listitem">
                    <TaskItem
                      task={task}
                      agent={agent}
                      project={project}
                      showProject={!projectId}
                      detail={execution.error?.split("\n")[0]}
                    >
                      <FailedState execution={execution} />
                    </TaskItem>
                  </div>
                )
            )}
          </ItemGroup>
        </PageSection>
      )}
    </>
  );
}

function TaskItem({
  task,
  agent,
  project,
  showProject,
  detail,
  children,
}: {
  task: Task;
  agent: Pick<AgentResponseDto, "id" | "name">;
  project: Pick<Project, "id" | "name">;
  showProject: boolean;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <Item size="xs" className="flex-1">
      <ItemMedia>
        <AgentIcon agent={agent} size="xs" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <ItemLink
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId: project.id, taskId: task.id }}
          >
            {taskTitle(task)}
          </ItemLink>
        </ItemTitle>
        <ItemDescription>
          <Link to="/agents/$agentId" params={{ agentId: agent.id }}>
            {agent.name}
          </Link>
          {showProject && (
            <>
              {" in "}
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="inline-flex items-center gap-1 align-bottom"
              >
                <ProjectIcon project={project} size="2xs" />
                {project.name}
              </Link>
            </>
          )}
          {detail && ` · ${detail}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  );
}

function FailedState({ execution }: { execution: Execution }) {
  return (
    <ExecutionStamp
      state="failed"
      date={execution.endedAt ?? execution.queuedAt}
    />
  );
}

function RunningState({ execution }: { execution: Execution }) {
  const state = attemptState(execution);
  const now = useNow(state === "running");

  return (
    <ExecutionState state={state}>
      {executionActivity(execution, now)}
    </ExecutionState>
  );
}

function StopAction({
  execution,
  projectId,
}: {
  execution: Execution;
  projectId: string;
}) {
  const canWrite = useProjectAccess("write", projectId);

  return canWrite && <TaskStopButton taskId={execution.taskId} />;
}
