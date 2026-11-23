import { activity, inject, update, upsert } from "@workflow";
import type { Updates, WorkflowEngine } from "@workflow";

import { Counter } from "./counter";
import { Helper } from "./helper";
import { probeAnnounceActivity } from "./probe-announce.activity";
import { probeTable } from "./probe-tables";

declare const anotherActivity: {
  execute: (count: number) => Promise<void>;
};

export const counterHandlers: Record<keyof Updates<Counter>, true> = {
  add: true,
  extend: true,
  note: true,
  report: true,
};

export const helperHandlers: Record<keyof Updates<Helper>, true> = {
  greet: true,
  finish: true,
};

export async function misuse(engine: WorkflowEngine) {
  // @ts-expect-error -- a handler argument of the wrong type
  await engine.get(Counter, "counter").add("one");

  // @ts-expect-error -- only its parent starts a child
  engine.start(Helper, "helper", "label");

  // @ts-expect-error -- run() of the counter takes a number
  engine.start(Counter, "counter", "goal");

  // @ts-expect-error -- an activity argument of the wrong type
  inject(probeAnnounceActivity)(42, "text");

  // @ts-expect-error -- the activity does not match its factory
  activity(probeAnnounceActivity, anotherActivity);

  // @ts-expect-error -- a column that the table does not have
  upsert(probeTable, { id: "probe", count: 0, rounds: 0, total: 0 });

  // @ts-expect-error -- a value outside the column type
  upsert(probeTable, { id: "probe", count: "zero", rounds: 0 });

  // @ts-expect-error -- a value outside the column type
  update(probeTable, { id: "probe", echoed: "one" });
}
