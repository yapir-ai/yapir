import { parseArgs } from "node:util";

import { runAgent } from "./agent";
import { run } from "./run";

const [command, ...args] = process.argv.slice(2);

if (command === "run") {
  const { values } = parseArgs({
    args,
    options: { "docker-data-root": { type: "string" } },
  });

  await run({ dockerDataRoot: values["docker-data-root"] });
} else if (command === "agent") {
  await runAgent();
} else {
  throw new Error(`Unknown command: ${command}`);
}
