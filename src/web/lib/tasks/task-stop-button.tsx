import type { QueryClient } from "@tanstack/query-core";
import { useDbClient } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import { client } from "@web/lib/api";
import { toastError } from "@web/lib/errors";
import { parseResponse } from "hono/client";
import { CircleStop } from "lucide-react";
import { useTransition } from "react";

import { refetchTask } from "./task-refresh";

export function TaskStopButton({ taskId }: { taskId: string }) {
  const queryClient =
    useDbClient().requireDependency<QueryClient>("queryClient");

  const [isPending, startStop] = useTransition();

  function stop() {
    startStop(async () => {
      await parseResponse(
        client.api.tasks[":taskId"].stop.$post({ param: { taskId } })
      ).catch(toastError);
      await refetchTask(queryClient, taskId);
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={stop}>
      <CircleStop data-icon="inline-start" />
      Stop execution
    </Button>
  );
}
