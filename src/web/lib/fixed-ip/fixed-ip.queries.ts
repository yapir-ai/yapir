import { query } from "@web/lib/db/query";

import { fixedIpCollection } from "./fixed-ip.collection";

export function fixedIpQuery() {
  return query((q) => q.from({ fixedIp: fixedIpCollection }).findOne());
}
