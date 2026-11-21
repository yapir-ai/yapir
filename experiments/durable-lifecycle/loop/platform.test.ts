import { expect, test } from "bun:test";

import { fakeOutside, leaseDuration, runnerIdentity } from "../contract";
import type { Deps, TaskEvent } from "../contract";
import { Execution } from "./execution";
import { Entity } from "./platform";
import type { Platform } from "./platform";
import { Runtime } from "./runtime";
import { Task } from "./task";

const event = (id: string): TaskEvent => ({ id, text: `event ${id}` });

// Starts one execution with the events that it gets, and keeps its result.
class Alone extends Entity<Deps> {
  result?: Awaited<ReturnType<Execution["run"]>>;
  private events: TaskEvent[] = [];

  async run() {
    await this.until(() => this.events.length > 0);

    const execution = this.start(Execution, {
      taskId: this.id,
      events: this.events,
    });

    this.events = [];
    this.result = await execution.result;
  }

  begin(events: TaskEvent[]) {
    this.events = events;
  }
}

let memory = 0;

// Breaks the rule: its story depends on a state that the journal does not hold.
class Forgetful extends Entity<Deps> {
  private poked = false;

  async run() {
    await this.until(() => this.poked);
    memory += 1;
    await (memory === 1
      ? this.outside.dispatch(this.id)
      : this.outside.release(this.id));
    await this.until(() => !this.poked);
  }

  poke() {
    this.poked = true;
  }
}

function start() {
  const outside = fakeOutside();

  const platform = new Runtime({
    outside: outside.deps,
    workflows: [Task, Execution, Alone, Forgetful],
  });

  return { outside, platform };
}

test("a task rests after its execution, and its journal is empty again", async () => {
  const { outside, platform } = start();
  const task = platform.to(Task, "task");

  await task.receive(event("e1"));
  const runner = platform.to(Execution, outside.dispatched[0]!);
  await runner.claim(runnerIdentity);
  await platform.restart();

  expect(await platform.read(Task, "task")).toMatchObject({ state: "running" });
  expect(platform.storage.entities.get("task")!.journal).not.toEqual([]);
  expect(await runner.pull()).toEqual({
    attempt: "running",
    events: [event("e1")],
  });
  expect(await runner.endTurn()).toEqual({ attempt: "succeeded" });

  expect(await platform.read(Task, "task")).toMatchObject({
    state: "idle",
    consecutiveFailures: 0,
  });
  expect(platform.storage.entities.get("task")!.journal).toEqual([]);
});

test("an execution alone gives back the events that its runner did not finish", async () => {
  const { outside, platform } = start();
  await platform.to(Alone, "alone").begin([event("e1"), event("e2")]);
  const [id] = outside.dispatched;
  const runner = platform.to(Execution, id!);
  await runner.claim(runnerIdentity);
  await runner.pull();

  await platform.advance(leaseDuration);

  expect(await platform.read(Execution, id!)).toMatchObject({
    end: { outcome: "failed", error: "The runner stopped responding" },
  });
  expect((await platform.read(Alone, "alone")).result).toEqual({
    outcome: "failed",
    unfinished: [event("e1"), event("e2")],
  });
  expect(outside.released).toEqual([id!]);
});

test("a story that depends on a state outside the journal fails at its replay", async () => {
  const { platform } = start();
  await platform.to(Forgetful, "forgetful").poke();

  await platform.restart();

  await expect(platform.read(Forgetful, "forgetful")).rejects.toThrow(
    "The replay diverged: the journal answers dispatch, the code called release"
  );
});

// Compiled, never run: `tsc` must report an error on each marked line.
export class RefusedInAWorkflow extends Entity<Deps> {
  async run() {
    // @ts-expect-error The input of a child has the type that its class declares.
    const execution = this.start(Execution, { taskId: 1, events: [] });
    // @ts-expect-error A parent reads the fields of a child, and does not write them.
    execution.claimed = true;
    // @ts-expect-error An outside call has the type that `Deps` declares.
    await this.outside.dispatch(1);
  }
}

export async function refusedOutside(platform: Platform) {
  // @ts-expect-error A message takes the parameters of its method.
  await platform.to(Task, "task").receive("e1");
  // @ts-expect-error A private method is not a message, and neither is `run`.
  await platform.to(Task, "task").execute();
  // @ts-expect-error A private field is not a part of the state.
  const { inbox } = await platform.read(Task, "task");

  return inbox;
}
