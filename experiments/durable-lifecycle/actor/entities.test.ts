import { expect, test } from "bun:test";

import { fakeOutside } from "../contract";
import type { TaskEvent } from "../contract";
import { Execution, Task } from "./lifecycle";
import { createRuntime } from "./runtime";

const event = (id: string): TaskEvent => ({ id, text: `event ${id}` });

function start() {
  const outside = fakeOutside();

  const yapir = createRuntime({
    entities: { Task, Execution },
    outside: outside.deps,
  });

  return { yapir, outside };
}

test("a failure gives the events of the turn and the waiting ones back to the task", async () => {
  const { yapir, outside } = start();
  await yapir.ask(Task, "task").receive(event("e1"));
  const [first] = outside.dispatched;
  await yapir.ask(Execution, first!).claim();
  await yapir.ask(Execution, first!).pull();
  await yapir.ask(Task, "task").receive(event("e2"));

  expect(await yapir.read(Execution, first!)).toMatchObject({
    turn: [event("e1")],
    waiting: [event("e2")],
  });

  await yapir.ask(Execution, first!).fail("The harness crashed");
  const [, retry] = outside.dispatched;

  expect(await yapir.read(Task, "task")).toMatchObject({
    phase: { state: "queued", execution: retry },
    consecutiveFailures: 1,
    pending: [],
  });
  expect(await yapir.read(Execution, retry!)).toMatchObject({
    waiting: [event("e1"), event("e2")],
  });
});

test("an event that reaches an execution after its end starts the next execution", async () => {
  const { yapir, outside } = start();
  await yapir.ask(Task, "task").receive(event("e1"));
  const [first] = outside.dispatched;
  await yapir.ask(Execution, first!).claim();
  await yapir.ask(Execution, first!).pull();

  await Promise.all([
    yapir.ask(Execution, first!).endTurn(),
    yapir.ask(Task, "task").receive(event("e2")),
  ]);

  const [, next] = outside.dispatched;

  expect(await yapir.read(Execution, first!)).toMatchObject({
    outcome: "succeeded",
  });
  expect(await yapir.read(Task, "task")).toMatchObject({
    phase: { state: "queued", execution: next },
  });
  expect(await yapir.read(Execution, next!)).toMatchObject({
    waiting: [event("e2")],
  });
});

test("a restart during a dispatch runs the dispatch again, once", async () => {
  const { yapir, outside } = start();
  outside.holdDispatch();
  await yapir.ask(Task, "task").receive(event("e1"));
  const [execution] = outside.dispatched;

  await yapir.restart();
  outside.completeDispatch();
  await yapir.restart();

  expect(outside.dispatched).toEqual([execution!, execution!]);
});
