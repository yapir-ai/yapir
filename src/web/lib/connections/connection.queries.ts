import type { ConnectionType } from "@server/lib/connections/connection.dto";
import { eq } from "@tanstack/react-db";
import { query } from "@web/lib/db/query";

import { connectionsCollection } from "./connection.collection";

export const connectionListQuery = query((q) =>
  q.from({ connection: connectionsCollection })
);

export function connectionInfoQuery(type: ConnectionType) {
  return query((q) =>
    q
      .from({ connection: connectionsCollection })
      .where(({ connection }) => eq(connection.type, type))
      .findOne()
  );
}
