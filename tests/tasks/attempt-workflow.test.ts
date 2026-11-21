import { attemptWorkflows } from "@server/lib/tasks/attempt.workflow";
import type { QueuedAttempt } from "@server/lib/tasks/machine/attempt";
import { expect, test } from "@test/kit/test";
import { Layer } from "effect";
import { TestClock } from "effect/testing";
import { WorkflowEngine } from "effect/workflow";

const attempt: QueuedAttempt = {
  id: "01960000-0000-7000-8000-000000000702",
  taskId: "01960000-0000-7000-8000-000000000701",
  dispatcher: "github-actions",
  ciRepository: { path: "acme/ci" },
  payload: {
    executionId: "01960000-0000-7000-8000-000000000702",
    claimId: "claim",
    cacheKey: "01960000-0000-7000-8000-000000000701",
    serverUrl: "https://yapir.example.com",
    image: "ghcr.io/yapir-ai/runner:latest",
  },
};

// The workflows in memory, with a clock that the test moves. The lease answers from the script, in order.
function workflows(
  journal: unknown[],
  { dispatch, leases }: { dispatch: () => Promise<void>; leases: number[] }
) {
  return attemptWorkflows(
    WorkflowEngine.layerMemory.pipe(Layer.provideMerge(TestClock.layer())),
    {
      dispatch: async (queued) => {
        journal.push({ dispatch: queued });
        await dispatch();
      },
      lease: async ({ id }) => {
        journal.push({ lease: id });

        return await Promise.resolve(leases.shift()!);
      },
    }
  );
}

test("the workflow starts the execution environment, then checks the lease each time it ends", async () => {
  const journal: unknown[] = [];

  const { runtime, start } = workflows(journal, {
    dispatch: async () => {
      await Promise.resolve();
    },
    leases: [10 * 60_000, 2 * 60_000, 0],
  });

  const lease = { lease: attempt.id };

  await start(attempt);
  await expect.poll(() => journal).toEqual([{ dispatch: attempt }, lease]);

  await runtime.runPromise(TestClock.adjust(10 * 60_000 - 1));
  await expect.poll(() => journal).toEqual([{ dispatch: attempt }, lease]);

  await runtime.runPromise(TestClock.adjust(1));
  await expect
    .poll(() => journal)
    .toEqual([{ dispatch: attempt }, lease, lease]);

  await runtime.runPromise(TestClock.adjust(2 * 60_000));
  await expect
    .poll(() => journal)
    .toEqual([{ dispatch: attempt }, lease, lease, lease]);
});

test("the workflow checks the lease of an attempt that it could not dispatch", async () => {
  const journal: unknown[] = [];

  const { start } = workflows(journal, {
    dispatch: async () => {
      await Promise.reject(new Error("The CI is down"));
    },
    leases: [0],
  });

  await start(attempt);

  await expect
    .poll(() => journal)
    .toEqual([{ dispatch: attempt }, { lease: attempt.id }]);
});
