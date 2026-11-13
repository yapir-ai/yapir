import { query } from "@web/lib/db/query";

import { apiKeysCollection } from "./api-key.collection";

export const apiKeyListQuery = query((q) =>
  q
    .from({ apiKey: apiKeysCollection })
    .orderBy(({ apiKey }) => apiKey.createdAt, "desc")
);
