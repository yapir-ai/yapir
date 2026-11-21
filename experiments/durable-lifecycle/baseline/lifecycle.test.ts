import type { Deps, World } from "../contract";
import { lifecycleScenarios } from "../scenarios";
import { taskMachine } from "./machine";
import type { Database } from "./machine";

const settled = async () => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setImmediate(resolve);
  await promise;
};

function baselineWorld(deps: Deps): World {
  const db: Database = { tasks: new Map(), executions: new Map() };
  const clock = { now: 0 };
  const machine = taskMachine(db, deps, clock);
  const execution = (id: string) => db.executions.get(id)!;

  return {
    async receive(taskId, event) {
      machine.accept({ taskId }, event);
      await settled();
    },
    async stop(taskId, userId) {
      machine.stop({ taskId }, { stoppedBy: userId });
      await settled();
    },
    async claim(executionId, identityToken) {
      const answer = await machine.claim(executionId, identityToken);
      await settled();

      return answer;
    },
    async pull(executionId, usage) {
      const answer = machine.pull(execution(executionId), usage);
      await settled();

      return answer;
    },
    async endTurn(executionId, usage) {
      const answer = machine.endTurn(execution(executionId), usage);
      await settled();

      return answer;
    },
    async fail(executionId, error) {
      const answer = machine.fail(execution(executionId), error);
      await settled();

      return answer;
    },
    async advance(ms) {
      const end = clock.now + ms;

      while (clock.now < end) {
        clock.now = Math.min(end, clock.now + 1000);
        machine.expire();
        await settled();
      }
    },
    // The rows are the durable storage: the process keeps nothing else.
    async restart() {
      await settled();
    },
    async task(taskId) {
      return machine.view(taskId);
    },
  };
}

lifecycleScenarios(baselineWorld);
