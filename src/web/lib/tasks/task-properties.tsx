import type { AgentResponseDto } from "@server/lib/agents/agent.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import { Code } from "@web/components/ui/code";
import { Link } from "@web/components/ui/link";
import {
  Properties,
  Property,
  PropertyList,
  PropertyText,
} from "@web/components/ui/properties";
import { RelativeTime } from "@web/components/ui/relative-time";
import { useCopy } from "@web/hooks/use-copy";
import { useNow } from "@web/hooks/use-now";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { HarnessLabel } from "@web/lib/agents/harness-label";
import { automationDispatchersQuery } from "@web/lib/automations/automation-catalog.queries";
import type { Automation } from "@web/lib/automations/automation.collection";
import type { Execution } from "@web/lib/executions/execution.collection";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { repositoryUrl } from "@web/lib/repositories/repository-url";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { TaskResource } from "./task-resource";
import {
  activeExecution,
  costLabel,
  durationLabel,
  taskResourceLabel,
  taskTotals,
  tokensLabel,
} from "./task.presentation";
import type { Task } from "./task.presentation";

const collapsedAssociations = 3;

export function TaskProperties({
  projectId,
  task,
  automation,
  agent,
  executions,
}: {
  projectId: string;
  task: Task;
  automation?: Automation;
  agent?: Pick<AgentResponseDto, "id" | "name" | "model" | "harness">;
  executions: Execution[];
}) {
  const { data: project } = useLiveSuspenseQuery(projectInfoQuery(projectId));

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  const { data: dispatchers } = useLiveSuspenseQuery(
    automationDispatchersQuery
  );

  const now = useNow(Boolean(activeExecution(executions)?.startedAt));
  const totals = taskTotals(executions, now);

  const dispatcher = dispatchers.find(
    ({ name }) => name === automation?.dispatcher
  );

  const [, ...associations] = task.associations;
  const [showAllAssociations, setShowAllAssociations] = useState(false);

  const shownAssociations = showAllAssociations
    ? associations
    : associations.slice(0, collapsedAssociations);

  const forkCommand = `yapir task fork ${task.id}`;
  const { copied, copy } = useCopy();

  return (
    <aside
      aria-label="Task properties"
      className="text-muted-foreground hidden content-start gap-5 overflow-y-auto @4xl:grid"
    >
      <Properties title="Properties">
        <PropertyList>
          <Property label="Project">
            {project && <ProjectIcon project={project} size="xs" />}
            <Link
              variant="muted"
              to="/projects/$projectId"
              params={{ projectId }}
            >
              {project?.name ?? "Project unavailable"}
            </Link>
          </Property>
          <Property label="Automation">
            <Link
              variant="muted"
              to="/projects/$projectId/automations/$automationId"
              params={{
                projectId,
                automationId: task.automationId,
              }}
            >
              {automation?.name ?? "Automation unavailable"}
            </Link>
          </Property>
          <Property label="Agent">
            {agent ? (
              <>
                <AgentIcon agent={agent} size="xs" />
                <Link
                  variant="muted"
                  to="/agents/$agentId"
                  params={{ agentId: agent.id }}
                >
                  {agent.name}
                </Link>
              </>
            ) : (
              "Agent unavailable"
            )}
          </Property>
          {agent && (
            <>
              <Property label="Model">
                <Code title={agent.model}>{agent.model}</Code>
              </Property>
              <Property label="Harness">
                <HarnessLabel harness={agent.harness} />
              </Property>
            </>
          )}
          <Property label="Environment">
            {dispatcher?.label ?? automation?.dispatcher}
          </Property>
          <Property label="Repositories">
            {repositories.map((repository) => (
              <TaskResource
                key={repository.id}
                provider={repository.provider}
                host={repository.host}
                label={repository.path}
                url={repositoryUrl(repository)}
                variant="muted"
              />
            ))}
          </Property>
          {associations.length > 0 && (
            <Property label="Associations">
              {shownAssociations.map((association) => (
                <TaskResource
                  key={JSON.stringify([
                    association.kind,
                    association.externalId,
                  ])}
                  provider={association.integration}
                  host={association.host}
                  label={taskResourceLabel(association.presentation)}
                  url={association.presentation.url}
                  variant="muted"
                />
              ))}
              {associations.length > collapsedAssociations && (
                <Button
                  variant="link"
                  size="xs"
                  className="-ms-2"
                  onClick={() => {
                    setShowAllAssociations(!showAllAssociations);
                  }}
                >
                  {showAllAssociations
                    ? "Show less"
                    : `+${associations.length - collapsedAssociations} more`}
                </Button>
              )}
            </Property>
          )}
          <Property label="Created">
            <RelativeTime date={task.createdAt} />
          </Property>
          <Property label="State since">
            <RelativeTime date={task.stateChangedAt} />
          </Property>
          {task.consecutiveFailures > 0 && (
            <Property label="Consecutive failures">
              {task.consecutiveFailures}
            </Property>
          )}
        </PropertyList>
      </Properties>
      <Properties title="Usage">
        <PropertyText>
          {executions.length === 1
            ? "1 execution"
            : `${executions.length} executions`}{" "}
          · {durationLabel(totals.duration)}
        </PropertyText>
        <PropertyText>
          {tokensLabel(totals.tokens)} · {costLabel(totals.cost)}
        </PropertyText>
      </Properties>
      <Properties title="Continue on your machine">
        <Button
          variant="outline"
          className="justify-self-start"
          size="xs"
          title={forkCommand}
          onClick={() => {
            void copy(forkCommand);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          Copy fork command
        </Button>
      </Properties>
    </aside>
  );
}
