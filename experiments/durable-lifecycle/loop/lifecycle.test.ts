import type { Deps, World } from "../contract";
import { lifecycleScenarios } from "../scenarios";
import { Execution } from "./execution";
import { Runtime } from "./runtime";
import { Task } from "./task";

function loopWorld(deps: Deps): World {
  const platform = new Runtime({
    outside: deps,
    workflows: [Task, Execution],
  });

  const task = (id: string) => platform.to(Task, id);
  const execution = (id: string) => platform.to(Execution, id);

  return {
    receive: async (taskId, event) => await task(taskId).receive(event),
    stop: async (taskId, userId) => await task(taskId).stop(userId),
    claim: async (executionId, identityToken) =>
      await execution(executionId).claim(identityToken),
    pull: async (executionId, usage) =>
      await execution(executionId).pull(usage),
    endTurn: async (executionId, usage) =>
      await execution(executionId).endTurn(usage),
    fail: async (executionId, error) =>
      await execution(executionId).fail(error),
    advance: async (ms) => await platform.advance(ms),
    restart: async () => await platform.restart(),
    // The task page: the state of the task, and the states of its executions.
    async task(taskId) {
      const { state, consecutiveFailures } = await platform.read(Task, taskId);
      const executions = await platform.children(Execution, taskId);

      return {
        state,
        consecutiveFailures,
        executions: executions.map(({ id, end, usage }) => ({
          id,
          usage,
          outcome: null,
          ...end,
        })),
      };
    },
  };
}

lifecycleScenarios(loopWorld);
