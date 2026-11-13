import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export interface Instance {
  url: string;
  key?: string;
}

export interface Config {
  default?: string;
  instances: Record<string, Instance>;
}

const configPath = path.join(homedir(), ".config", "yapir", "config.json");

export async function readConfig(): Promise<Config> {
  if (!existsSync(configPath)) {
    return { instances: {} };
  }

  // SAFETY: only writeConfig writes this file.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return JSON.parse(await readFile(configPath, "utf-8")) as Config;
}

export async function writeConfig(config: Config) {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function readProjectUrl() {
  for (let directory = process.cwd(); ; directory = path.dirname(directory)) {
    const file = path.join(directory, "yapir.json");

    if (existsSync(file)) {
      // SAFETY: yapir.json holds the URL of the project's instance.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const project = JSON.parse(await readFile(file, "utf-8")) as {
        url: string;
      };

      return project.url;
    }

    if (directory === path.dirname(directory)) {
      return;
    }
  }
}
