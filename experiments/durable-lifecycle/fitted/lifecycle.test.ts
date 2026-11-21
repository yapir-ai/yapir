import type { Deps, World } from "../contract";
import { lifecycleScenarios } from "../scenarios";
import { Execution, Task } from "./lifecycle";
import type { End } from "./lifecycle";
import type { Reply } from "./platform";
import { testPlatform } from "./runtime";

const turn = <Events>(reply: Reply<End, Events>) =>
  "ended" in reply
    ? { attempt: reply.ended.outcome }
    : { attempt: "running" as const, events: reply.answer };

function fittedWorld(deps: Deps): World {
  const { platform, advance, restart } = testPlatform({
    entities: [Task],
    outside: { reads: deps, effects: deps },
  });

  const task = (id: string) => platform.entity(Task, id);
  const execution = (id: string) => platform.workflow(Execution, id);

  return {
    receive: async (taskId, event) => await task(taskId).receive(event),
    stop: async (taskId, userId) => await task(taskId).stop(userId),

    async claim(executionId, identityToken) {
      const reply = await execution(executionId).claim(identityToken);

      return "ended" in reply
        ? { claimed: false, outcome: reply.ended.outcome }
        : reply.answer;
    },
    pull: async (executionId, usage) =>
      turn(await execution(executionId).pull(usage)),
    endTurn: async (executionId, usage) =>
      turn(await execution(executionId).endTurn(usage)),
    async fail(executionId, error) {
      const { ended } = await execution(executionId).fail(error);

      return { attempt: ended.outcome };
    },

    advance,
    restart,

    async task(taskId) {
      const view = await platform.view(Task, taskId);
      const executions = await platform.history(Execution, taskId);

      return {
        ...view,
        executions: executions.map(({ id, state, ended }) => ({
          id,
          outcome: null,
          ...ended,
          usage: state.usage,
        })),
      };
    },
  };
}

lifecycleScenarios(fittedWorld);
