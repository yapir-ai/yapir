import type { HarnessName } from "@server/lib/executions/harness.dto";

import { harnessOptions } from "./agent.options";

export function HarnessLabel({ harness }: { harness: HarnessName }) {
  const option = harnessOptions.find(({ value }) => value === harness);

  return (
    <span className="flex items-center gap-2">
      {option?.icon}
      {option?.label}
    </span>
  );
}
