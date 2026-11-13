import type { QueryClient } from "@tanstack/query-core";
import { useDbClient } from "@tanstack/react-db";
import { MessageComposer } from "@web/components/message-composer";
import { client } from "@web/lib/api";
import { toastError } from "@web/lib/errors";
import { parseResponse } from "hono/client";

import { refetchTask } from "./task-refresh";

export function TaskMessageComposer({
  taskId,
  active,
}: {
  taskId: string;
  active: boolean;
}) {
  const queryClient =
    useDbClient().requireDependency<QueryClient>("queryClient");

  async function send(message: string) {
    await parseResponse(
      client.api.tasks[":taskId"].messages.$post({
        param: { taskId },
        json: { message },
      })
    ).catch(toastError);
    await refetchTask(queryClient, taskId);
  }

  return (
    <MessageComposer
      placeholder={
        active
          ? "Message the agent: it reads the message at its next turn"
          : "Message the agent to start a new execution"
      }
      submitKey="mod+enter"
      onSend={send}
    />
  );
}
