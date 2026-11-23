import { activity, workflowEngine } from "@workflow";

import type { TestDb } from "../test";
import { Counter } from "./counter";
import { Helper } from "./helper";
import { probeActivities } from "./probe.activities";
import { Rogue } from "./rogue";
import { Witness } from "./witness";

export function probes(db: TestDb) {
  const clock = { now: new Date("2026-09-01T10:00:00Z") };
  const activities: Promise<void>[] = [];

  const engine = workflowEngine({
    db,
    clock,
    executionContext: {
      waitUntil(promise) {
        activities.push(promise);
      },
    },
    workflows: {
      counter: Counter,
      helper: Helper,
      witness: Witness,
      rogue: Rogue,
    },
    activities: [activity(probeActivities, probeActivities({ db }))],
  });

  return { engine, clock, activities };
}
