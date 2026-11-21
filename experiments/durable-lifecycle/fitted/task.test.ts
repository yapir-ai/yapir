import { expect, test } from "bun:test";

import { fakeOutside, leaseDuration, runnerIdentity } from "../contract";
import { Execution, Task } from "./lifecycle";
import { testPlatform } from "./runtime";

const review = { id: "e1", text: "Review the change" };

function start() {
  const outside = fakeOutside();

  const kit = testPlatform({
    entities: [Task],
    outside: { reads: outside.deps, effects: outside.deps },
  });

  return {
    ...kit,
    outside,
    task: kit.platform.entity(Task, "task"),
    execution: (id: string) => kit.platform.workflow(Execution, id),
  };
}

test("a runner that stops calling fails its execution, and the task retries the turn", async () => {
  const { platform, advance, outside, task, execution } = start();
  await task.receive(review);
  const [silent] = outside.dispatched;
  await execution(silent!).claim(runnerIdentity);
  await execution(silent!).pull();

  await advance(leaseDuration);

  expect(await execution(silent!).pull()).toEqual({
    ended: { outcome: "failed", error: "The runner stopped responding" },
  });
  expect(await platform.view(Task, "task")).toEqual({
    state: "queued",
    consecutiveFailures: 1,
  });

  const [, retry] = outside.dispatched;
  await execution(retry!).claim(runnerIdentity);

  expect(await execution(retry!).pull()).toEqual({ answer: [review] });
});

test("a stop ends the execution and keeps how it ended", async () => {
  const { platform, outside, task, execution } = start();
  await task.receive(review);
  const [stopped] = outside.dispatched;
  await execution(stopped!).claim(runnerIdentity);

  await task.stop("user-1");

  expect(await platform.history(Execution, "task")).toEqual([
    {
      id: stopped!,
      state: { phase: "running" },
      ended: { outcome: "stopped", stoppedBy: "user-1" },
    },
  ]);
  expect(await execution(stopped!).endTurn()).toEqual({
    ended: { outcome: "stopped", stoppedBy: "user-1" },
  });
});

test("a restart during a dispatch runs the dispatch again for the same execution", async () => {
  const { platform, restart, outside, task, execution } = start();
  outside.holdDispatch();
  await task.receive(review);
  const [queued] = outside.dispatched;

  await restart();

  expect(outside.dispatched).toEqual([queued!, queued!]);

  outside.completeDispatch();

  expect(await execution(queued!).claim(runnerIdentity)).toEqual({
    answer: { claimed: true, context: { taskId: "task" } },
  });
  expect(await platform.view(Task, "task")).toEqual({
    state: "running",
    consecutiveFailures: 0,
  });
});
