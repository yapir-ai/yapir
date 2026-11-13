import type { Command } from "commander";

import { readConfig, readProjectUrl, writeConfig } from "./config.ts";
import type { Config } from "./config.ts";
import { request } from "./request.ts";

export function addInstanceCommands(program: Command) {
  program
    .command("login")
    .description(
      "Store a Yapir instance and your API key. The first instance is the default."
    )
    .requiredOption("--url <url>", "Yapir instance URL")
    .requiredOption(
      "--key <key>",
      "API key, created in Yapir from the user menu"
    )
    .option(
      "--name <name>",
      "Instance name, for --instance. Defaults to the first label of the URL host. Logging in again with a name replaces its instance."
    )
    .action(
      async ({
        url,
        key,
        name = new URL(url).hostname.split(".")[0]!,
      }: {
        url: string;
        key: string;
        name?: string;
      }) => {
        const response = await request(
          new URL("/api/auth/get-session", url),
          key
        );

        if (!response) {
          return;
        }

        // SAFETY: Better Auth resolves the session of a valid API key.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const { user } = (await response.json()) as {
          user: { name: string; email: string };
        };

        const config = await readConfig();
        config.instances[name] = { url, key };
        config.default ??= name;
        await writeConfig(config);

        console.log(
          `Logged in to ${name} (${url}) as ${user.name} <${user.email}>.${config.default === name ? " It is the default instance." : ""}`
        );
      }
    );

  const instance = program
    .command("instance")
    .description("Manage the stored Yapir instances");

  instance
    .command("list")
    .description("List the stored instances, without their API keys")
    .action(async () => {
      const config = await readConfig();

      const instances = Object.entries(config.instances).map(
        ([name, { url }]) => ({ name, url, default: name === config.default })
      );

      console.log(JSON.stringify(instances, null, 2));
    });

  instance
    .command("use")
    .description("Make an instance the default")
    .argument("<name>", "Instance name")
    .action(async (name: string, _options, command: Command) => {
      const config = await readConfig();
      namedInstance(command, config, name);
      config.default = name;
      await writeConfig(config);
      console.log(`${name} is now the default instance.`);
    });

  instance
    .command("remove")
    .description(
      "Remove an instance. When it is the default, the first remaining instance becomes the default."
    )
    .argument("<name>", "Instance name")
    .action(async (name: string) => {
      const config = await readConfig();
      const { [name]: _removed, ...instances } = config.instances;
      config.instances = instances;

      const isDefault = config.default === name;

      if (isDefault) {
        [config.default] = Object.keys(instances);
      }

      await writeConfig(config);
      console.log(
        `Removed ${name}.${isDefault && config.default ? ` The default instance is now ${config.default}.` : ""}`
      );
    });
}

// The environment overrides the stored instances, for headless environments.
export async function selectInstance(program: Command) {
  const { YAPIR_URL: url, YAPIR_API_KEY: key } = process.env;
  const instance = url ? { url } : await storedInstance(program);

  return instance && { url: instance.url, key: key ?? instance.key };
}

async function storedInstance(program: Command) {
  const config = await readConfig();
  const { instance } = program.opts<{ instance?: string }>();

  if (instance) {
    return namedInstance(program, config, instance);
  }

  const projectUrl = await readProjectUrl();

  if (projectUrl) {
    return (
      Object.values(config.instances).find(({ url }) => url === projectUrl) ??
      program.error(
        `The project's yapir.json uses ${projectUrl}. Log in to it: yapir login --url ${projectUrl} --key <api key>`
      )
    );
  }

  return config.default ? config.instances[config.default] : undefined;
}

function namedInstance(command: Command, config: Config, name: string) {
  return (
    config.instances[name] ??
    command.error(`Unknown instance ${name}. See yapir instance list.`)
  );
}
