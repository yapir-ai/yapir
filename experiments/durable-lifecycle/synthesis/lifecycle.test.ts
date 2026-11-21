import type { Deps, TaskEvent, TurnAnswer, World } from "../contract";
import { lifecycleScenarios } from "../scenarios";
import { Execution, Task } from "./lifecycle";
import type { End } from "./lifecycle";
import type { Reply } from "./platform";
import { createRuntime } from "./runtime";

const turnAnswer = (reply: Reply<End, TaskEvent[]>): TurnAnswer =>
  "ended" in reply
    ? { attempt: reply.ended.outcome }
    : { attempt: "running", events: reply.answer };

function synthesisWorld(deps: Deps): World {
  const yapir = createRuntime({
    entities: { Task },
    workflows: { Execution },
    outside: deps,
  });

  return {
    receive: async (taskId, event) => {
      await yapir.ask(Task, taskId).receive(event);
    },
    stop: async (taskId, userId) => {
      await yapir.ask(Task, taskId).stop(userId);
    },

    // The route proves the runner and reads its context before the execution decides.
    async claim(executionId, identityToken) {
      const { parent } = await yapir.read(Execution, executionId);
      await deps.authenticateRunner(executionId, identityToken);
      const context = await deps.claimContext(parent.id);
      const reply = await yapir.ask(Execution, executionId).claim();

      if ("ended" in reply) {
        return { claimed: false, outcome: reply.ended.outcome };
      }

      return reply.answer
        ? { claimed: true, context }
        : { claimed: false, outcome: null };
    },
    pull: async (executionId, usage) =>
      turnAnswer(await yapir.ask(Execution, executionId).pull(usage)),
    endTurn: async (executionId, usage) =>
      turnAnswer(await yapir.ask(Execution, executionId).endTurn(usage)),
    async fail(executionId, error) {
      const { ended } = await yapir.ask(Execution, executionId).fail(error);

      return { attempt: ended.outcome };
    },

    advance: async (ms) => {
      await yapir.advance(ms);
    },
    restart: async () => {
      await yapir.restart();
    },

    async task(taskId) {
      const task = await yapir.read(Task, taskId);
      const executions = await yapir.list(Task, taskId, Execution);

      return {
        state: task.state,
        consecutiveFailures: task.consecutiveFailures,
        executions: executions.map(({ id, ended, usage }) => ({
          id,
          outcome: ended?.outcome ?? null,
          error: ended?.outcome === "failed" ? ended.error : undefined,
          stoppedBy: ended?.outcome === "stopped" ? ended.stoppedBy : undefined,
          usage,
        })),
      };
    },
  };
}

lifecycleScenarios(synthesisWorld);
