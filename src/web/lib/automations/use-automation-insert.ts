import { executionEnvironment } from "@server/lib/executions/dispatcher";
import { useDbClient, useLiveSuspenseQuery } from "@tanstack/react-db";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { v7 as uuidv7 } from "uuid";

import { automationDispatchersQuery } from "./automation-catalog.queries";
import { automationsCollection } from "./automation.collection";

export function useAutomationInsert(projectId: string) {
  const dbClient = useDbClient();

  const { data: dispatchers } = useLiveSuspenseQuery(
    automationDispatchersQuery
  );

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  const { data: project } = useLiveSuspenseQuery(projectInfoQuery(projectId));

  return async (automation: { name: string; agentId: string }) => {
    const id = uuidv7();

    await dbClient
      .collection(automationsCollection(projectId))
      .insert({
        ...automation,
        id,
        projectId,
        enabled: false,
        deletedAt: null,
        instructions: "",
        triggers: [],
        capabilities: [],
        ...executionEnvironment(
          dispatchers,
          { ciRepositoryId: project?.ciRepositoryId ?? null, repositories },
          {}
        ),
      })
      .when("settled");

    return id;
  };
}
