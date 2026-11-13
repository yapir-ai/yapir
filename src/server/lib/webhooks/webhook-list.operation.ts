import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { WebhookListRequestDto } from "./webhook-list.dto";
import { toResponseDto } from "./webhook.dto";

export function webhookListOperation({ db }: { db: Db }) {
  async function execute({ offset, limit, id, order }: WebhookListRequestDto) {
    const webhooks = await db.query.webhookTable.findMany({
      columns: { secret: false },
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: webhooks.map(toResponseDto) };
  }

  return { execute };
}
