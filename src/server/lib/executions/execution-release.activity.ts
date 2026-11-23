import type { Dispatchers } from "./dispatcher";
import type { DispatcherName } from "./dispatcher.dto";

export function executionReleaseActivity({
  dispatchers,
}: {
  dispatchers: Promise<Dispatchers>;
}) {
  async function execute(executionId: string, dispatcher: DispatcherName) {
    await (await dispatchers).get(dispatcher)?.release({ id: executionId });
  }

  return { execute };
}

export type ExecutionReleaseActivity = ReturnType<
  typeof executionReleaseActivity
>;
