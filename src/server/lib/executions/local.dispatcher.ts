import type { ExecutionSelect } from "@server/lib/db/schema";

import type { DispatchPayloadDto } from "./dispatch-payload.dto";
import type { Dispatcher, QueuedExecution } from "./dispatcher";

// Runs each execution in a Docker container of the development host. See scripts/local-dispatcher.ts.
export function localDispatcher(url: string): Dispatcher {
  async function send(
    action: "dispatch" | "release",
    body: Pick<DispatchPayloadDto, "executionId">
  ) {
    const response = await fetch(`${url}/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  async function dispatch({ payload }: QueuedExecution) {
    await send("dispatch", payload);
  }

  async function authenticate() {
    // Only the local container receives the dispatch payload: its claim ID proves the runner.
  }

  async function release({ id }: Pick<ExecutionSelect, "id">) {
    await send("release", { executionId: id });
  }

  return { name: "local", label: "Local", dispatch, authenticate, release };
}
