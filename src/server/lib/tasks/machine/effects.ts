import type { ExecutionSelect } from "@server/lib/db/schema";
import type { Dispatchers } from "@server/lib/executions/dispatcher";

import type { QueuedAttempt } from "./attempt";

export type Effect =
  | { type: "dispatch"; attempt: QueuedAttempt }
  | {
      type: "release";
      attempt: Pick<ExecutionSelect, "id" | "dispatcher">;
    };

export const dispatch = (attempt: QueuedAttempt): Effect => ({
  type: "dispatch",
  attempt,
});

export const release = (
  attempt: Pick<ExecutionSelect, "id" | "dispatcher">
): Effect => ({ type: "release", attempt });

// Starting an environment can exceed the Git host's webhook timeout: the effects run after the response.
export function effectRunner({
  dispatchers,
  executionContext,
}: {
  dispatchers: Promise<Dispatchers>;
  executionContext: Pick<ExecutionContext, "waitUntil">;
}) {
  async function run(effects: Effect[]) {
    const available = await dispatchers;

    for (const { type, attempt } of effects) {
      const dispatcher = available.get(attempt.dispatcher);

      await (type === "release"
        ? dispatcher?.release(attempt)
        : dispatcher?.dispatch(attempt));
    }
  }

  return (effects: Effect[]) => {
    if (effects.length > 0) {
      executionContext.waitUntil(run(effects));
    }
  };
}
