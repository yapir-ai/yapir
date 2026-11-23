import type { Db } from "@server/lib/db";

import { probeCallTable } from "./probe-tables";

export function probeActivities({ db }: { db: Db }) {
  async function announce(workflowId: string, text: string) {
    await db.insert(probeCallTable).values({ workflowId, text });
  }

  return { announce };
}
