import { expect, test } from "bun:test";

import { fakeOutside, leaseDuration } from "../contract";
import type { TaskEvent } from "../contract";
import { Execution, Task } from "./lifecycle";
import { createRuntime } from "./runtime";

const event = (id: string): TaskEvent => ({ id, text: `event ${id}` });

async function running(...events: TaskEvent[]) {
  const outside = fakeOutside();

  const yapir = createRuntime({
    entities: { Task },
    workflows: { Execution },
    outside: outside.deps,
  });

  for (const received of events) {
    await yapir.ask(Task, "task").receive(received);
  }

  const [execution] = outside.dispatched;
  await yapir.ask(Execution, execution!).claim();

  return { yapir, outside, execution: execution! };
}

test("a runner that calls after the end of its execution gets the end and changes nothing", async () => {
  const { yapir, execution } = await running(event("e1"));
  await yapir.ask(Execution, execution).pull();
  await yapir.advance(leaseDuration);
  const retrying = structuredClone(await yapir.read(Task, "task"));

  expect(await yapir.ask(Execution, execution).endTurn()).toEqual({
    ended: { outcome: "failed", error: "The runner stopped responding" },
  });
  expect(await yapir.read(Task, "task")).toEqual(retrying);
  expect(retrying.execution?.waiting).toEqual([event("e1")]);
});

test("an event received in the same instant as the end of an execution starts the next one", async () => {
  const { yapir, outside, execution } = await running(event("e1"));
  await yapir.ask(Execution, execution).pull();

  await Promise.all([
    yapir.ask(Execution, execution).endTurn(),
    yapir.ask(Task, "task").receive(event("e2")),
  ]);

  const [, next] = outside.dispatched;
  const executions = await yapir.list(Task, "task", Execution);

  expect(executions.map(({ id, ended }) => ({ id, ended }))).toEqual([
    { id: execution, ended: { outcome: "succeeded" } },
    { id: next!, ended: undefined },
  ]);
  expect(executions[1]!.waiting).toEqual([event("e2")]);
});

test("a restart rebuilds the task with its live execution", async () => {
  const { yapir, execution } = await running(event("e1"));

  await yapir.restart();
  await yapir.ask(Task, "task").receive(event("e2"));

  expect((await yapir.read(Execution, execution)).waiting).toEqual([
    event("e1"),
    event("e2"),
  ]);
});
