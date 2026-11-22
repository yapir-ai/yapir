import { activity, inject } from "@server/lib/workflows/activity";
import type { WorkflowEngine } from "@server/lib/workflows/engine";
import { update, upsert } from "@server/lib/workflows/projection";
import type { Updates } from "@server/lib/workflows/workflow.types";

import { Counter } from "./counter";
import { Helper } from "./helper";
import { probeAnnounceOperation } from "./probe-announce.operation";
import { probeTable } from "./probe-tables";

declare const operationOfAnotherActivity: {
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
  inject(probeAnnounceOperation)(42, "text");

  // @ts-expect-error -- the activity does not match its operation
  activity(probeAnnounceOperation, operationOfAnotherActivity);

  // @ts-expect-error -- a column that the table does not have
  upsert(probeTable, { id: "probe", count: 0, rounds: 0, total: 0 });

  // @ts-expect-error -- a value outside the column type
  upsert(probeTable, { id: "probe", count: "zero", rounds: 0 });

  // @ts-expect-error -- a value outside the column type
  update(probeTable, { id: "probe", echoed: "one" });
}
