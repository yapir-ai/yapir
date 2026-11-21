import type { Deps, World } from "../contract";
import { lifecycleScenarios } from "../scenarios";
import { Execution, Task } from "./lifecycle";
import { createRuntime } from "./runtime";

function actorWorld(deps: Deps): World {
  const yapir = createRuntime({ entities: { Task, Execution }, outside: deps });

  return {
    receive: async (taskId, event) => {
      await yapir.ask(Task, taskId).receive(event);
    },
    stop: async (taskId, userId) => {
      await yapir.ask(Task, taskId).stop(userId);
    },

    // The route proves the runner and reads its context before the execution decides.
    async claim(executionId, identityToken) {
      const { taskId } = await yapir.read(Execution, executionId);
      await deps.authenticateRunner(executionId, identityToken);
      const context = await deps.claimContext(taskId);
      const answer = await yapir.ask(Execution, executionId).claim();

      return answer.claimed ? { claimed: true, context } : answer;
    },
    pull: async (executionId, usage) =>
      await yapir.ask(Execution, executionId).pull(usage),
    endTurn: async (executionId, usage) =>
      await yapir.ask(Execution, executionId).endTurn(usage),
    fail: async (executionId, error) =>
      await yapir.ask(Execution, executionId).fail(error),

    advance: async (ms) => {
      await yapir.advance(ms);
    },
    restart: async () => {
      await yapir.restart();
    },

    async task(taskId) {
      const task = await yapir.read(Task, taskId);

      return {
        state: task.phase.state,
        consecutiveFailures: task.consecutiveFailures,
        executions: await Promise.all(
          task.executions.map(async (id) => {
            const { outcome, error, stoppedBy, usage } = await yapir.read(
              Execution,
              id
            );

            return { id, outcome, error, stoppedBy, usage };
          })
        ),
      };
    },
  };
}

lifecycleScenarios(actorWorld);
