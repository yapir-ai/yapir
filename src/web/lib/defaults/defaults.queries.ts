import { query } from "@web/lib/db/query";

import { defaultsCollection } from "./defaults.collection";

export function defaultsQuery() {
  return query((q) => q.from({ defaults: defaultsCollection }).findOne());
}
