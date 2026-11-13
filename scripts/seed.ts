import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { AgentCreateRequest } from "@server/lib/agents/agent-create.dto";
import type { AgentCreateRequestDto } from "@server/lib/agents/agent-create.dto";
import { AutomationCreateRequest } from "@server/lib/automations/automation-create.dto";
import type { AutomationCreateRequestDto } from "@server/lib/automations/automation-create.dto";
import type { AutomationExecutionCreateRequestDto } from "@server/lib/automations/automation-execution-create.dto";
import type { ConnectionCreateRequestDto } from "@server/lib/connections/connection-create.dto";
import { ConnectionSchema } from "@server/lib/connections/connection.dto";
import { DefaultsUpdateRequest } from "@server/lib/defaults/defaults-update.dto";
import type { DefaultsUpdateRequestDto } from "@server/lib/defaults/defaults-update.dto";
import { ModelProviderCreateRequest } from "@server/lib/model-providers/model-provider-create.dto";
import type { ModelProviderCreateRequestDto } from "@server/lib/model-providers/model-provider-create.dto";
import type { ProjectRepositoryCreateRequestDto } from "@server/lib/project-repositories/project-repository-create.dto";
import { ProjectCreateRequest } from "@server/lib/projects/project-create.dto";
import type { ProjectCreateRequestDto } from "@server/lib/projects/project-create.dto";
import type { TaskMessageCreateRequestDto } from "@server/lib/tasks/task-message-create.dto";
import { z } from "zod";

export const seedPath = path.join(homedir(), ".config", "yapir", "seed.json");

const NameSchema = z.string().trim().min(1);

const SeedSchema = z.strictObject({
  modelProviders: z.array(ModelProviderCreateRequest),
  defaults: DefaultsUpdateRequest.omit({ modelProviderId: true }).extend({
    modelProvider: NameSchema,
  }),
  connections: z.array(ConnectionSchema),
  projects: z.array(
    ProjectCreateRequest.extend({ repositories: z.array(NameSchema) })
  ),
  agents: z.array(
    AgentCreateRequest.omit({ modelProviderId: true }).extend({
      modelProvider: NameSchema,
    })
  ),
  automations: z.array(
    AutomationCreateRequest.omit({
      agentId: true,
      projectId: true,
      ciRepositoryId: true,
    }).extend({ agent: NameSchema, project: NameSchema })
  ),
});

export type Seed = z.infer<typeof SeedSchema>;

export const readSeed = async () =>
  SeedSchema.parse(JSON.parse(await readFile(seedPath, "utf-8")));

export type ApiRequest =
  | ModelProviderCreateRequestDto
  | DefaultsUpdateRequestDto
  | ConnectionCreateRequestDto
  | AgentCreateRequestDto
  | ProjectCreateRequestDto
  | ProjectRepositoryCreateRequestDto
  | AutomationCreateRequestDto
  | AutomationExecutionCreateRequestDto
  | TaskMessageCreateRequestDto;

export type Api = <T extends z.ZodType>(
  schema: T,
  method: string,
  route: string,
  body?: ApiRequest
) => Promise<z.infer<T>>;

const CreatedSchema = z.object({ id: z.string() });

const RepositoryListSchema = z.object({
  items: z.array(z.object({ id: z.string(), path: z.string() })),
});

async function createEach<T extends { name: string }>(
  items: T[],
  create: (item: T) => Promise<{ id: string }>
) {
  const ids = new Map<string, string>();

  for (const item of items) {
    ids.set(item.name, (await create(item)).id);
  }

  return ids;
}

function idOf(ids: Map<string, string>, name: string) {
  const id = ids.get(name);

  if (!id) {
    throw new Error(`The seed references an unknown name: ${name}`);
  }

  return id;
}

// The Git hosts import their repositories after the Connections: GitLab in the background, GitHub at once.
async function waitForRepositories(api: Api, paths: string[]) {
  for (let second = 0; second < 60; second += 1) {
    const { items } = await api(
      RepositoryListSchema,
      "GET",
      "/repositories?limit=100"
    );

    const ids = new Map(
      items.map((repository) => [repository.path, repository.id])
    );

    if (paths.every((repositoryPath) => ids.has(repositoryPath))) {
      return ids;
    }

    await sleep(1000);
  }

  throw new Error(`The repositories ${paths.join(", ")} are not imported`);
}

export async function applySeed(
  seed: Seed,
  api: Api,
  importGithubRepositories: () => Promise<void>
) {
  const modelProviders = await createEach(
    seed.modelProviders,
    async (provider) =>
      await api(CreatedSchema, "POST", "/model-providers", provider)
  );

  const { modelProvider: defaultModelProvider, ...defaults } = seed.defaults;
  await api(z.unknown(), "PATCH", "/defaults", {
    ...defaults,
    modelProviderId: idOf(modelProviders, defaultModelProvider),
  });

  for (const connection of seed.connections) {
    await api(z.unknown(), "POST", "/connections", connection);
  }

  await importGithubRepositories();

  const agents = await createEach(
    seed.agents,
    async ({ modelProvider, ...agent }) =>
      await api(CreatedSchema, "POST", "/agents", {
        ...agent,
        modelProviderId: idOf(modelProviders, modelProvider),
      })
  );

  const repositories = await waitForRepositories(
    api,
    seed.projects.flatMap((project) => project.repositories)
  );

  const projects = await createEach(
    seed.projects,
    async ({ repositories: paths, ...project }) => {
      const created = await api(CreatedSchema, "POST", "/projects", project);

      for (const repositoryPath of paths) {
        await api(z.unknown(), "POST", `/projects/${created.id}/repositories`, {
          repositoryId: idOf(repositories, repositoryPath),
        });
      }

      return created;
    }
  );

  for (const { agent, project, ...automation } of seed.automations) {
    await api(z.unknown(), "POST", "/automations", {
      ...automation,
      agentId: idOf(agents, agent),
      projectId: idOf(projects, project),
    });
  }
}
