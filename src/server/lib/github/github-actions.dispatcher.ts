import type { ApiEnv } from "@server/lib/env";
import type {
  Dispatcher,
  QueuedExecution,
} from "@server/lib/executions/dispatcher";
import { verifyRunnerIdentity } from "@server/lib/executions/runner-identity";

import { githubRepository } from "./github.service";
import type { GithubService } from "./github.service";

// The CI repository defines its execution environment in this workflow. See src/content/execution-environments/github-actions.md.
const workflow = "yapir.yml";
const issuer = "https://token.actions.githubusercontent.com";

export function githubActionsDispatcher({
  env,
  githubService,
}: {
  env: ApiEnv;
  githubService: GithubService;
}): Dispatcher {
  async function repositoryInfo(path: string) {
    const client = await githubService.client();
    const { data } = await client.repos.get(githubRepository(path));

    return { client, data };
  }

  async function dispatch({ ciRepository, payload }: QueuedExecution) {
    const { client, data } = await repositoryInfo(ciRepository!.path);
    // The default branch holds the reviewed workflow: an agent cannot change its own environment from a branch.
    await client.actions.createWorkflowDispatch({
      ...githubRepository(ciRepository!.path),
      workflow_id: workflow,
      ref: data.default_branch,
      inputs: { dispatch: JSON.stringify(payload) },
    });
  }

  async function authenticate(
    identityToken: string | undefined,
    ciRepository: { path: string } | null
  ) {
    const { data } = await repositoryInfo(ciRepository!.path);
    await verifyRunnerIdentity(identityToken, {
      issuer,
      jwksUri: `${issuer}/.well-known/jwks`,
      audience: env.SERVER_URL,
      claims: {
        repository: data.full_name,
        event_name: "workflow_dispatch",
        workflow_ref: `${data.full_name}/.github/workflows/${workflow}@refs/heads/${data.default_branch}`,
      },
    });
  }

  async function release() {
    // The runner exits by itself, and the workflow's timeout bounds a stuck one.
  }

  return {
    name: "github-actions",
    label: "GitHub Actions",
    dispatch,
    authenticate,
    release,
  };
}
