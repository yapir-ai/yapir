import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { networkPolicyTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";

import type { NetworkPolicyUpdateRequestDto } from "./network-policy-update.dto";
import { toResponseDto } from "./network-policy.dto";

export function networkPolicyUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: NetworkPolicyUpdateRequestDto) {
    await currentUser.requireAdmin();

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(await db.query.networkPolicyTable.findFirst());
    }

    const [networkPolicy] = await db
      .insert(networkPolicyTable)
      .values(requestDto)
      .onConflictDoUpdate({ target: networkPolicyTable.id, set: requestDto })
      .returning();

    return toResponseDto(networkPolicy);
  }

  return { execute };
}
