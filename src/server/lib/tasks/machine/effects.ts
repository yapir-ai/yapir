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

// The workflow of an attempt starts its execution environment: the effects only run after the response.
export function effectRunner({
  dispatchers,
  executionContext,
  superviseAttempt,
}: {
  dispatchers: Promise<Dispatchers>;
  executionContext: Pick<ExecutionContext, "waitUntil">;
  superviseAttempt: (attempt: QueuedAttempt) => Promise<void>;
}) {
  async function run(effects: Effect[]) {
    const available = await dispatchers;

    for (const effect of effects) {
      await (effect.type === "release"
        ? available.get(effect.attempt.dispatcher)?.release(effect.attempt)
        : superviseAttempt(effect.attempt));
    }
  }

  return (effects: Effect[]) => {
    if (effects.length > 0) {
      executionContext.waitUntil(run(effects));
    }
  };
}
