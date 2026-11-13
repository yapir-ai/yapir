import type { Db } from "@server/lib/db";
import { automationCommitIdentity } from "@server/lib/executions/execution-commit-identity";
import { modelProxyPath } from "@server/lib/executions/runner-path";
import type { ModelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";
import { allowedHosts } from "@server/lib/network-policy/network-policy.dto";

import type { TaskContext } from "../task.service";

export async function claimContext(
  {
    db,
    modelProviderResolveOperation,
  }: { db: Db; modelProviderResolveOperation: ModelProviderResolveOperation },
  { agent, automation, project, repositories }: TaskContext
) {
  const {
    modelProvider: { catalogId, baseUrl },
    endpoints,
  } = await modelProviderResolveOperation.execute(agent.modelProviderId);

  const skills = await db.query.skillTable.findMany({
    columns: { name: true, description: true, instructions: true },
    where: { id: { in: agent.skillIds }, deletedAt: { isNull: true } },
  });

  return {
    automation: {
      harness: agent.harness,
      model: {
        catalogId,
        id: agent.model,
        effort: agent.effort,
        baseUrl: modelProxyPath(baseUrl),
        endpoints: Object.fromEntries(
          endpoints.map((endpoint) => [
            endpoint.id,
            modelProxyPath(endpoint.baseUrl),
          ])
        ),
      },
      instructions: agent.prompt,
      skills,
      commitIdentity: automationCommitIdentity(automation),
    },
    allowedHosts: allowedHosts(await db.query.networkPolicyTable.findFirst()),
    project: {
      instructions: project.instructions,
      repositories: repositories.map(({ path }) => ({ path })),
    },
  };
}

export const ciRepository = ({ automation, repositories }: TaskContext) =>
  repositories.find(({ id }) => id === automation.ciRepositoryId) ?? null;
