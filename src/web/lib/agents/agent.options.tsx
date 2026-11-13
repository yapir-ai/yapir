import { HarnessNameSchema } from "@server/lib/executions/harness.dto";

import { HarnessIcon } from "./harness-icon";

export const harnessOptions = Object.entries(HarnessNameSchema.enum).map(
  ([label, value]) => ({ label, value, icon: <HarnessIcon harness={value} /> })
);

export const harnessDescription = "It runs the agent and its tools.";
