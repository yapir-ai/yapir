import { infoQuery, listFilter, query } from "@web/lib/db/query";
import { executionListCollection } from "@web/lib/executions/execution.collection";

import { projectsCollection } from "./project.collection";

export function projectListQuery(search = "", showDeleted = false) {
  const { term, matches } = listFilter(search, showDeleted);

  return {
    queryKey: ["projects", term, showDeleted],
    ...query((q) =>
      q
        .from({ project: projectsCollection })
        .fn.where(({ project }) => matches(project.deletedAt, project.name))
        .orderBy(({ project }) => project.name)
    ),
  };
}

export function projectInfoQuery(projectId: string) {
  return infoQuery(projectsCollection, projectId);
}

export function projectLastExecutionQuery(projectId: string) {
  return query((q) =>
    q
      .from({ execution: executionListCollection({ projectId }) })
      .orderBy(({ execution }) => execution.id, "desc")
      .limit(1)
      .findOne()
  );
}
