import type { ExecutionOutcome } from "@server/lib/executions/execution.dto";
import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { readSubsetWindow } from "@web/lib/db/read-subset-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type Execution = InferResponseType<
  typeof client.api.executions.$get,
  200
>["items"][number];

export const latestExecutionsCollection = collection("executions:latest", {
  syncMode: "on-demand",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex,
  queryFn: async ({ signal, meta }) =>
    await readSubsetWindow(
      async (query) =>
        await parseResponse(
          client.api.executions.$get(
            { query: { ...query, latest: "true" } },
            { init: { signal } }
          )
        ),
      meta?.loadSubsetOptions,
      { equality: ["id", "taskId"], unique: ["taskId"] }
    ),
  getKey: (execution) => execution.id,
});

export function executionListCollection(filters: {
  projectId?: string;
  outcome?: ExecutionOutcome[];
  active?: "true";
  latest?: "true";
}) {
  return collection(`executions:list:${JSON.stringify(filters)}`, {
    syncMode: "on-demand",
    refetchInterval: 15_000,
    autoIndex: "eager",
    defaultIndexType: BTreeIndex,
    queryFn: async ({ signal, meta }) =>
      await readSubsetWindow(
        async (query) =>
          await parseResponse(
            client.api.executions.$get(
              { query: { ...query, ...filters } },
              { init: { signal } }
            )
          ),
        meta?.loadSubsetOptions,
        { equality: ["id", "taskId"] }
      ),
    getKey: (execution) => execution.id,
  });
}

export function executionsCollection(taskId: string) {
  return collection(`executions:${taskId}`, {
    queryKey: ["executions", taskId],
    syncMode: "eager",
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(
            client.api.executions.$get(
              {
                query: {
                  taskId,
                  ...page,
                },
              },
              { init: { signal } }
            )
          )
      ),
    getKey: (execution) => execution.id,
  });
}
