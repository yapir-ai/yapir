import type { QueryClient } from "@tanstack/query-core";
import { useDbClient } from "@tanstack/react-db";
import { useEffect } from "react";

const refreshInterval = 5000;

export async function refetchTask(queryClient: QueryClient, taskId: string) {
  await queryClient.refetchQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === "tasks" ||
      String(queryKey[0]).startsWith("executions:") ||
      queryKey[1] === taskId,
  });
}

export function useTaskRefresh(taskId: string, active: boolean) {
  const queryClient =
    useDbClient().requireDependency<QueryClient>("queryClient");

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = setInterval(() => {
      void refetchTask(queryClient, taskId);
    }, refreshInterval);

    // The last poll can see the execution end before its last messages.
    return () => {
      clearInterval(timer);
      void refetchTask(queryClient, taskId);
    };
  }, [queryClient, taskId, active]);
}
