import { systemClock } from "@server/lib/clock/clock";

import { cloudflareWorker } from "./cloudflare-worker";

// The Durable Object that runs each workflow.
export { ClusterWorkflow } from "@effect/platform-cloudflare/CloudflareDurableObjects";

export default cloudflareWorker(systemClock).worker;
