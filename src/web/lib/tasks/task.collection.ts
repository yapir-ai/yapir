import type { TaskListRequestDto } from "@server/lib/tasks/task-list.dto";
import type { QueryClient, QueryFilters } from "@tanstack/query-core";
import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readSubsetWindow } from "@web/lib/db/read-subset-window";
import { parseResponse } from "hono/client";

// Without a project, the scope covers every accessible project.
interface TaskListScope extends Pick<TaskListRequestDto, "search" | "state"> {
  projectId?: string;
}

// Search and state cover automation/resource metadata and the latest execution, not predicates on Task fields.
// This read-only collection represents the backend's filtered Task read view.
export function tasksCollection({ projectId, search, state }: TaskListScope) {
  const scope = [projectId ?? "", search ?? "", ...(state ?? [])];

  return collection(`tasks:${JSON.stringify(scope)}`, {
    queryKey: ["tasks", ...scope],
    syncMode: "on-demand",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex,
    queryFn: async ({ signal, meta }) =>
      await readSubsetWindow(
        async (query) =>
          await parseResponse(
            client.api.tasks.$get(
              { query: { ...query, projectId, search, state } },
              { init: { signal } }
            )
          ),
        meta?.loadSubsetOptions,
        {
          equality: ["id", "automationId"],
          timestamps: ["createdAt", "stateChangedAt"],
          sort: {
            createdAt: (task) => task.createdAt,
            stateChangedAt: (task) => task.stateChangedAt,
          },
        }
      ),
    getKey: (task) => task.id,
  });
}

export async function invalidateTaskSearchReads(
  queryClient: QueryClient,
  projectId: string
) {
  const filters = {
    queryKey: ["tasks", projectId],
    predicate: (query) => query.queryKey[2] !== "",
  } satisfies QueryFilters;

  queryClient.removeQueries({ ...filters, type: "inactive" });
  await queryClient.invalidateQueries({ ...filters, refetchType: "active" });
}
