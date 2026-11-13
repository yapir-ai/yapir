import type { FetchLike } from "@modelcontextprotocol/client";

// The fixed IP of the instance, given by its platform: the requests of its fetch come from its address.
export interface FixedIp {
  address: string;
  fetch: FetchLike;
}
