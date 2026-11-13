import { attemptState } from "@server/lib/executions/execution.dto";
import { useLiveQuery } from "@tanstack/react-db";
import { ProviderIcon } from "@web/components/ui/provider-icon";
import { RelativeTime } from "@web/components/ui/relative-time";
import { ExecutionState } from "@web/lib/executions/execution-state";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";

import { projectLastExecutionQuery } from "./project.queries";

export function ProjectRepositoriesSummary({
  projectId,
}: {
  projectId: string;
}) {
  const { data: repositories } = useLiveQuery(
    projectRepositoryListQuery(projectId)
  );

  const [first, ...others] = repositories;

  return (
    first && (
      <span className="flex items-center gap-2">
        <ProviderIcon provider={first.provider} />
        {first.path}
        {others.length > 0 && ` +${others.length}`}
      </span>
    )
  );
}

export function ProjectLastExecution({ projectId }: { projectId: string }) {
  const { data: execution } = useLiveQuery(
    projectLastExecutionQuery(projectId)
  );

  return (
    execution && (
      <span className="flex items-center gap-3">
        <ExecutionState state={attemptState(execution)} />
        <RelativeTime date={execution.startedAt ?? execution.queuedAt} />
      </span>
    )
  );
}
