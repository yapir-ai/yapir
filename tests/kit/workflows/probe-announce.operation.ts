import type { Db } from "@server/lib/db";

import { probeCallTable } from "./probe-tables";

export function probeAnnounceOperation({ db }: { db: Db }) {
  async function execute(workflowId: string, text: string) {
    await db.insert(probeCallTable).values({ workflowId, text });
  }

  return { execute };
}
