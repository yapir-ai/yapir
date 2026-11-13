import type { Db } from "@server/lib/db";

import { toResponseDto } from "./network-policy.dto";

export function networkPolicyInfoOperation({ db }: { db: Db }) {
  async function execute() {
    return toResponseDto(await db.query.networkPolicyTable.findFirst());
  }

  return { execute };
}
