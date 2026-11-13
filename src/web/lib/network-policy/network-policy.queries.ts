import { query } from "@web/lib/db/query";

import { networkPolicyCollection } from "./network-policy.collection";

export function networkPolicyQuery() {
  return query((q) =>
    q.from({ networkPolicy: networkPolicyCollection }).findOne()
  );
}
