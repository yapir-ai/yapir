#!/usr/bin/env node
import { Command } from "commander";

import { addForkCommand } from "./fork.ts";
import { addInstanceCommands, selectInstance } from "./instances.ts";
import { addOperations } from "./operations.ts";
import type { OpenAPIDocument } from "./operations.ts";

const program = new Command("yapir")
  .description(
    "Yapir from the command line. Commands print the API's JSON responses."
  )
  .option(
    "--instance <name>",
    "Stored Yapir instance to use. Defaults to the instance of the project's yapir.json, else to the default instance."
  );

addInstanceCommands(program);

// The instance commands run without an instance, so they can fix a failing selection or a wrong URL.
const { operands } = program.parseOptions(process.argv.slice(2));

const isInstanceCommand = program.commands.some(
  (command) => command.name() === operands[0]
);

const instance = isInstanceCommand ? undefined : await selectInstance(program);

if (instance) {
  const response = await fetch(new URL("/api/openapi.json", instance.url));
  // SAFETY: the instance serves its OpenAPI document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const document = (await response.json()) as OpenAPIDocument;
  program.addHelpText("before", document.info.description);
  addOperations(program, document, instance);
  addForkCommand(program, instance);
}

await program.parseAsync();
