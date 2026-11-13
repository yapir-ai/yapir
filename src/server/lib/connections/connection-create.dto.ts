import { gitlabConnection } from "@server/lib/gitlab/gitlab.connection";
import { z } from "zod";

import { connectionFields } from "./connection.dto";

export const ConnectionCreateRequest = z.discriminatedUnion("type", [
  connectionFields.github.extend({ type: z.literal("github") }),
  connectionFields.gitlab.extend({
    webhookSigningToken: gitlabConnection.generated.shape.webhookSigningToken
      .unwrap()
      .optional()
      .describe(
        "The secret that signs the deliveries of the webhooks that Yapir installs. Generated when absent"
      ),
    type: z.literal("gitlab"),
  }),
  connectionFields.jira.extend({ type: z.literal("jira") }),
]);

export type ConnectionCreateRequestDto = z.infer<
  typeof ConnectionCreateRequest
>;
