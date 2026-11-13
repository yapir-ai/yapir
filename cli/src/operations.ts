import { text } from "node:stream/consumers";

import type { Command } from "commander";

import type { Instance } from "./config.ts";
import { request } from "./request.ts";

interface Parameter {
  name: string;
  in: "path" | "query";
  description?: string;
}

interface Operation {
  operationId: string;
  summary?: string;
  parameters?: Parameter[];
  requestBody?: { content: { "application/json": { schema: unknown } } };
}

// The instance's /api/openapi.json, as the CLI reads it.
export interface OpenAPIDocument {
  info: { description: string };
  servers: [{ url: string }];
  paths: Record<string, Record<string, Operation>>;
}

const pathParameter = /\{(?<name>\w+)\}/gu;

// Adds `yapir <resource> <operation>` for each operation of the document, named after its operationId: `projectMemberList` is `yapir project-member list`.
export function addOperations(
  program: Command,
  document: OpenAPIDocument,
  instance: Instance
) {
  for (const [path, methods] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const words = operation.operationId.split(/(?=[A-Z])/u);
      const name = words.pop()!.toLowerCase();
      const resource = kebabCase(words.join(""));

      const resourceCommand =
        program.commands.find((command) => command.name() === resource) ??
        program.command(resource);

      addOperation(
        resourceCommand.command(name),
        { method, serverPath: document.servers[0].url + path, operation },
        instance
      );
    }
  }
}

// Path parameters are positional arguments, query parameters repeatable options, the body JSON from --data.
function addOperation(
  command: Command,
  {
    method,
    serverPath,
    operation,
  }: { method: string; serverPath: string; operation: Operation },
  { url, key }: Instance
) {
  const parameters = operation.parameters ?? [];

  const pathNames = [...serverPath.matchAll(pathParameter)].map(
    ({ groups }) => groups!.name!
  );

  const queryParameters = parameters.filter(
    (parameter) => parameter.in === "query"
  );

  const body = operation.requestBody?.content["application/json"].schema;

  command.description(operation.summary ?? "");

  for (const name of pathNames) {
    command.argument(
      `<${name}>`,
      parameters.find((parameter) => parameter.name === name)?.description
    );
  }

  for (const { name, description } of queryParameters) {
    command.option(
      `--${kebabCase(name)} <value>`,
      description ?? "",
      (value: string, previous: string[] | undefined) => [
        ...(previous ?? []),
        value,
      ]
    );
  }

  if (body) {
    command
      .option("--data <json>", "JSON request body, - to read it from stdin")
      .addHelpText(
        "after",
        `\nBody JSON Schema:\n${JSON.stringify(body, null, 2)}`
      );
  }

  command.action(async () => {
    const requestUrl = new URL(
      serverPath.replaceAll(pathParameter, (_, name: string) =>
        encodeURIComponent(command.args[pathNames.indexOf(name)]!)
      ),
      url
    );

    const options = command.opts<Record<string, string[]>>();

    for (const { name } of queryParameters) {
      for (const value of options[name] ?? []) {
        requestUrl.searchParams.append(name, value);
      }
    }

    const { data } = command.opts<{ data?: string }>();

    const response = await request(requestUrl, key, {
      method: method.toUpperCase(),
      headers: { ...(data && { "content-type": "application/json" }) },
      body: data === "-" ? await text(process.stdin) : data,
    });

    const output = await response?.text();

    if (output) {
      console.log(output);
    }
  });
}

function kebabCase(name: string) {
  return name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
}
