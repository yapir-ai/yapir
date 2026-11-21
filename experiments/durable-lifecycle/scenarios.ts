import { describe, expect, test } from "bun:test";

import {
  claimTimeout,
  fakeOutside,
  leaseDuration,
  runnerIdentity,
} from "./contract";
import type { CreateWorld, TaskEvent, World } from "./contract";

const event = (id: string): TaskEvent => ({ id, text: `event ${id}` });

const minute = 60_000;
const second = 1000;

// One input at a time: a restart never interrupts another input.
function restartingAfterEachInput(world: World): World {
  let last: Promise<unknown> = Promise.resolve();

  const restarting =
    <Parameters extends unknown[], Answer>(
      input: (...parameters: Parameters) => Promise<Answer>
    ) =>
    async (...parameters: Parameters) => {
      const previous = last;
      const { promise, resolve } = Promise.withResolvers<undefined>();
      last = promise;
      await previous;

      try {
        return await input(...parameters);
      } finally {
        await world.restart();
        resolve(undefined);
      }
    };

  return {
    receive: restarting(world.receive.bind(world)),
    stop: restarting(world.stop.bind(world)),
    claim: restarting(world.claim.bind(world)),
    pull: restarting(world.pull.bind(world)),
    endTurn: restarting(world.endTurn.bind(world)),
    fail: restarting(world.fail.bind(world)),
    advance: restarting(world.advance.bind(world)),
    restart: world.restart.bind(world),
    task: world.task.bind(world),
  };
}

export function lifecycleScenarios(createWorld: CreateWorld) {
  const modes = [
    { mode: "in one process", restarts: false },
    { mode: "with a restart after each input", restarts: true },
  ];

  describe.each(modes)("the task lifecycle, $mode", ({ restarts }) => {
    async function start() {
      const outside = fakeOutside();
      const created = await createWorld(outside.deps);
      const world = restarts ? restartingAfterEachInput(created) : created;

      return { world, outside };
    }

    async function startRunning(...events: TaskEvent[]) {
      const context = await start();

      for (const received of events) {
        await context.world.receive("task", received);
      }

      const [execution] = context.outside.dispatched;
      await context.world.claim(execution!, runnerIdentity);

      return { ...context, execution: execution! };
    }

    test("the first event of a task starts an execution", async () => {
      const { world, outside } = await start();

      await world.receive("task", event("e1"));

      expect(outside.dispatched).toHaveLength(1);
      expect(await world.task("task")).toEqual({
        state: "queued",
        consecutiveFailures: 0,
        executions: [{ id: outside.dispatched[0]!, outcome: null }],
      });
    });

    test("a claim starts the execution and gives the runner its context", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));

      const claimed = await world.claim(outside.dispatched[0]!, runnerIdentity);

      expect(claimed).toEqual({ claimed: true, context: { taskId: "task" } });
      expect((await world.task("task")).state).toBe("running");
    });

    test("a pull delivers each waiting event once, in the order of their reception", async () => {
      const { world, execution } = await startRunning(event("e1"), event("e2"));

      expect(await world.pull(execution)).toEqual({
        attempt: "running",
        events: [event("e1"), event("e2")],
      });
      expect(await world.pull(execution)).toEqual({
        attempt: "running",
        events: [],
      });
    });

    test("an event received during a turn reaches the running execution", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);

      await world.receive("task", event("e2"));

      expect(await world.pull(execution)).toEqual({
        attempt: "running",
        events: [event("e2")],
      });
      expect(outside.dispatched).toHaveLength(1);
    });

    test("a turn end starts the next turn with the events received since", async () => {
      const { world, execution } = await startRunning(event("e1"));
      await world.pull(execution);
      await world.receive("task", event("e2"));

      expect(await world.endTurn(execution)).toEqual({
        attempt: "running",
        events: [event("e2")],
      });
      expect((await world.task("task")).state).toBe("running");
    });

    test("a turn end without waiting events ends the execution and rests the task", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);

      expect(await world.endTurn(execution)).toEqual({ attempt: "succeeded" });

      const rested = {
        state: "idle" as const,
        consecutiveFailures: 0,
        executions: [{ id: execution, outcome: "succeeded" as const }],
      };

      expect(await world.task("task")).toEqual(rested);

      await world.advance(60 * minute);

      expect(await world.task("task")).toEqual(rested);
      expect(outside.dispatched).toHaveLength(1);
      expect(outside.released).toEqual([]);
    });

    test("an event for a resting task starts a new execution", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);
      await world.endTurn(execution);

      await world.receive("task", event("e2"));

      const [, second] = outside.dispatched;

      expect(await world.task("task")).toEqual({
        state: "queued",
        consecutiveFailures: 0,
        executions: [
          { id: execution, outcome: "succeeded" },
          { id: second!, outcome: null },
        ],
      });

      await world.claim(second!, runnerIdentity);

      expect(await world.pull(second!)).toEqual({
        attempt: "running",
        events: [event("e2")],
      });
    });

    test("an event that the task already received is ignored", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.receive("task", event("e1"));

      expect(await world.pull(execution)).toEqual({
        attempt: "running",
        events: [event("e1")],
      });

      await world.endTurn(execution);
      await world.receive("task", event("e1"));

      expect((await world.task("task")).state).toBe("idle");
      expect(outside.dispatched).toHaveLength(1);
    });

    test("events that arrive together for a new task start one execution", async () => {
      const { world, outside } = await start();

      await Promise.all([
        world.receive("task", event("e1")),
        world.receive("task", event("e2")),
      ]);

      expect(outside.dispatched).toHaveLength(1);

      await world.claim(outside.dispatched[0]!, runnerIdentity);
      const pulled = await world.pull(outside.dispatched[0]!);

      expect(pulled).toEqual({
        attempt: "running",
        events: expect.arrayContaining([event("e1"), event("e2")]),
      });
    });

    test("tasks do not share events or executions", async () => {
      const { world, outside } = await start();
      await world.receive("task-1", event("e1"));
      await world.receive("task-2", event("e2"));
      const [first, second] = outside.dispatched;
      await world.claim(first!, runnerIdentity);

      await world.fail(first!, "The harness crashed");

      expect((await world.task("task-1")).consecutiveFailures).toBe(1);
      expect(await world.task("task-2")).toEqual({
        state: "queued",
        consecutiveFailures: 0,
        executions: [{ id: second!, outcome: null }],
      });
    });

    test("a failure gives the events of the unfinished turn back to the task, which retries them", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);
      await world.receive("task", event("e2"));
      await world.endTurn(execution);
      await world.receive("task", event("e3"));

      expect(await world.fail(execution, "The harness crashed")).toEqual({
        attempt: "failed",
      });

      const [, retry] = outside.dispatched;

      expect(outside.released).toEqual([execution]);
      expect(await world.task("task")).toEqual({
        state: "queued",
        consecutiveFailures: 1,
        executions: [
          { id: execution, outcome: "failed", error: "The harness crashed" },
          { id: retry!, outcome: null },
        ],
      });

      await world.claim(retry!, runnerIdentity);

      expect(await world.pull(retry!)).toEqual({
        attempt: "running",
        events: [event("e2"), event("e3")],
      });
    });

    test("the third failure in a row blocks the task until its next event", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));

      for (const _attempt of [1, 2, 3]) {
        await world.fail(outside.dispatched.at(-1)!, "The harness crashed");
      }

      expect(outside.dispatched).toHaveLength(3);
      expect(await world.task("task")).toMatchObject({
        state: "blocked",
        consecutiveFailures: 3,
      });

      await world.receive("task", event("e2"));

      expect(outside.dispatched).toHaveLength(4);
      expect((await world.task("task")).state).toBe("queued");

      await world.fail(outside.dispatched.at(-1)!, "The harness crashed");

      expect(outside.dispatched).toHaveLength(4);
      expect(await world.task("task")).toMatchObject({
        state: "blocked",
        consecutiveFailures: 4,
      });
    });

    test("a success resets the count of failures", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));
      await world.fail(outside.dispatched[0]!, "The harness crashed");
      const [, retry] = outside.dispatched;
      await world.claim(retry!, runnerIdentity);
      await world.pull(retry!);

      await world.endTurn(retry!);

      expect(await world.task("task")).toMatchObject({
        state: "idle",
        consecutiveFailures: 0,
      });
    });

    test("an execution that no runner claims in time fails, and the task retries", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));
      const [unclaimed] = outside.dispatched;

      await world.advance(claimTimeout - second);

      expect((await world.task("task")).executions).toEqual([
        { id: unclaimed!, outcome: null },
      ]);

      await world.advance(2 * second);

      expect(outside.released).toEqual([unclaimed!]);
      expect(await world.task("task")).toEqual({
        state: "queued",
        consecutiveFailures: 1,
        executions: [
          {
            id: unclaimed!,
            outcome: "failed",
            error: "No runner claimed the execution within 10 minutes",
          },
          { id: outside.dispatched[1]!, outcome: null },
        ],
      });
    });

    test("a claimed execution does not fail at the claim timeout", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));
      await world.advance(claimTimeout - minute);
      const [execution] = outside.dispatched;
      await world.claim(execution!, runnerIdentity);

      await world.advance(minute + 30 * second);

      expect(await world.pull(execution!)).toEqual({
        attempt: "running",
        events: [event("e1")],
      });
    });

    test("an execution whose runner stops calling fails, and each call gives it more time", async () => {
      const { world, execution } = await startRunning(event("e1"));

      await world.advance(leaseDuration - 10 * second);
      await world.pull(execution);
      await world.advance(leaseDuration - 10 * second);
      await world.receive("task", event("e2"));

      expect(await world.endTurn(execution)).toEqual({
        attempt: "running",
        events: [event("e2")],
      });

      await world.advance(leaseDuration - 10 * second);

      expect((await world.task("task")).state).toBe("running");

      await world.advance(11 * second);

      expect((await world.task("task")).executions[0]).toEqual({
        id: execution,
        outcome: "failed",
        error: "The runner stopped responding",
      });
    });

    test("a call from the runner of an ended execution learns how it ended and changes nothing", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);
      await world.advance(leaseDuration + second);
      const retrying = await world.task("task");

      expect(await world.pull(execution)).toEqual({ attempt: "failed" });
      expect(await world.endTurn(execution)).toEqual({ attempt: "failed" });
      expect(await world.fail(execution, "Too late")).toEqual({
        attempt: "failed",
      });
      expect(await world.claim(execution, runnerIdentity)).toEqual({
        claimed: false,
        outcome: "failed",
      });

      expect(await world.task("task")).toEqual(retrying);
      expect(retrying.state).toBe("queued");
      expect(outside.dispatched).toHaveLength(2);
    });

    test("a stop ends the running execution and rests the task until its next event", async () => {
      const { world, outside, execution } = await startRunning(event("e1"));
      await world.pull(execution);

      await world.stop("task", "user-1");

      expect(outside.released).toEqual([execution]);
      expect(await world.task("task")).toEqual({
        state: "stopped",
        consecutiveFailures: 0,
        executions: [
          { id: execution, outcome: "stopped", stoppedBy: "user-1" },
        ],
      });
      expect(await world.pull(execution)).toEqual({ attempt: "stopped" });

      await world.advance(60 * minute);

      expect(outside.dispatched).toHaveLength(1);

      await world.receive("task", event("e2"));
      const [, next] = outside.dispatched;
      await world.claim(next!, runnerIdentity);

      expect(await world.pull(next!)).toEqual({
        attempt: "running",
        events: [event("e1"), event("e2")],
      });
    });

    test("a stop ends an execution that no runner claimed yet", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));
      const [execution] = outside.dispatched;

      await world.stop("task", "user-1");

      expect((await world.task("task")).state).toBe("stopped");
      expect(await world.claim(execution!, runnerIdentity)).toEqual({
        claimed: false,
        outcome: "stopped",
      });
    });

    test("a stop changes nothing for a resting task", async () => {
      const { world, execution } = await startRunning(event("e1"));
      await world.pull(execution);
      await world.endTurn(execution);
      const rested = await world.task("task");

      await world.stop("task", "user-1");

      expect(await world.task("task")).toEqual(rested);
    });

    test("only one runner claims an execution", async () => {
      const { world, execution } = await startRunning(event("e1"));

      expect(await world.claim(execution, runnerIdentity)).toEqual({
        claimed: false,
        outcome: null,
      });
    });

    test("a claim that does not prove its runner is rejected and leaves the execution claimable", async () => {
      const { world, outside } = await start();
      await world.receive("task", event("e1"));
      const [execution] = outside.dispatched;

      await expect(world.claim(execution!, "forged")).rejects.toThrow();
      await expect(
        world.claim("unknown-execution", runnerIdentity)
      ).rejects.toThrow();

      expect((await world.task("task")).state).toBe("queued");
      expect(await world.claim(execution!, runnerIdentity)).toMatchObject({
        claimed: true,
      });
    });

    test("a dispatch that fails fails the execution, and the task retries", async () => {
      const { world, outside } = await start();
      outside.failNextDispatch("No runner is available");

      await world.receive("task", event("e1"));

      expect(await world.task("task")).toEqual({
        state: "queued",
        consecutiveFailures: 1,
        executions: [
          {
            id: outside.dispatched[0]!,
            outcome: "failed",
            error: "No runner is available",
          },
          { id: outside.dispatched[1]!, outcome: null },
        ],
      });
    });

    test("the execution keeps the last usage that its runner reported", async () => {
      const { world, execution } = await startRunning(event("e1"));

      await world.pull(execution, { inputTokens: 10, outputTokens: 2 });
      await world.endTurn(execution, { inputTokens: 30, outputTokens: 5 });

      expect((await world.task("task")).executions).toEqual([
        {
          id: execution,
          outcome: "succeeded",
          usage: { inputTokens: 30, outputTokens: 5 },
        },
      ]);
    });
  });

  // A restart during the dispatch call runs it again: dispatch is at-least-once.
  test("a runner that claims before the dispatch call returns runs its execution", async () => {
    const outside = fakeOutside();
    const world = await createWorld(outside.deps);
    outside.holdDispatch();
    await world.receive("task", event("e1"));
    const [execution] = outside.dispatched;

    expect(await world.claim(execution!, runnerIdentity)).toMatchObject({
      claimed: true,
    });

    outside.completeDispatch();

    expect(await world.pull(execution!)).toEqual({
      attempt: "running",
      events: [event("e1")],
    });
  });
}
