import { z } from "zod";

import { HostPatternSchema } from "./network-policy.dto";

export const NetworkPolicyUpdateRequest = z
  .strictObject({
    enabled: z
      .boolean()
      .describe(
        "Whether the executions reach only the allowed hosts, the hosts of their injected credentials and the services of their CI job"
      ),
    includeYapirHosts: z
      .boolean()
      .describe(
        "Whether the allowed hosts include Yapir's defaults: the hosts of common tools and package registries"
      ),
    hosts: z
      .array(HostPatternSchema)
      .describe("The organization's allowed hosts"),
  })
  .partial();

export type NetworkPolicyUpdateRequestDto = z.infer<
  typeof NetworkPolicyUpdateRequest
>;
