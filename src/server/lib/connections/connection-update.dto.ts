import { z } from "zod";

import { connectionFields } from "./connection.dto";

// Fits the Connection's type: the operation validates the resulting Connection.
export const ConnectionUpdateRequest = z.union([
  connectionFields.github.partial(),
  connectionFields.gitlab.partial(),
  connectionFields.jira.partial(),
]);

export type ConnectionUpdateRequestDto = z.infer<
  typeof ConnectionUpdateRequest
>;
