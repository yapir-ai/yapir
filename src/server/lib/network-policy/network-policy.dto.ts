import type { NetworkPolicySelect } from "@server/lib/db/schema";
import { z } from "zod";

import { yapirHosts } from "./yapir-hosts";

export const HostPatternSchema = z
  .string()
  .regex(
    /^(?:\*\.)?(?:[a-z0-9-]+\.)+[a-z0-9-]+$/u,
    "Enter a host, such as example.com or *.example.com"
  )
  .describe(
    "A host, such as example.com, or its subdomains, such as *.example.com"
  );

// Until an Organization Admin configures it, the network policy is disabled.
export const toResponseDto = (
  networkPolicy: NetworkPolicySelect | undefined
) => ({
  enabled: networkPolicy?.enabled ?? false,
  includeYapirHosts: networkPolicy?.includeYapirHosts ?? true,
  hosts: networkPolicy?.hosts ?? [],
  yapirHosts,
});

export const allowedHosts = (networkPolicy: NetworkPolicySelect | undefined) =>
  networkPolicy?.enabled
    ? [
        ...(networkPolicy.includeYapirHosts ? yapirHosts : []),
        ...networkPolicy.hosts,
      ]
    : null;
