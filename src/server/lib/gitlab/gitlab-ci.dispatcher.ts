import type { Gitlab } from "@gitbeaker/rest";
import type { ApiEnv } from "@server/lib/env";
import type {
  Dispatcher,
  QueuedExecution,
} from "@server/lib/executions/dispatcher";
import { verifyRunnerIdentity } from "@server/lib/executions/runner-identity";

// The CI repository defines its execution environment in its .gitlab-ci.yml. See src/content/execution-environments/gitlab-ci.md.
export function gitlabCiDispatcher({
  env,
  gitlab,
  url,
}: {
  env: ApiEnv;
  gitlab: Gitlab;
  url: string;
}): Dispatcher {
  async function dispatch({ ciRepository, payload }: QueuedExecution) {
    // The default branch holds the reviewed configuration: an agent cannot change its own environment from a branch.
    const { default_branch } = await gitlab.Projects.show(ciRepository!.path);

    // Inputs, not variables: projects often restrict pipeline variables.
    // CI/CD configuration cannot parse JSON, so the values that it uses are inputs of their own.
    const inputs = {
      dispatch: JSON.stringify(payload),
      cache_key: payload.cacheKey,
      image: payload.image,
      server_url: payload.serverUrl,
    };

    await gitlab.Pipelines.create(ciRepository!.path, default_branch, {
      inputs,
    });
  }

  async function authenticate(
    identityToken: string | undefined,
    ciRepository: { path: string } | null
  ) {
    const project = await gitlab.Projects.show(ciRepository!.path);
    await verifyRunnerIdentity(identityToken, {
      issuer: url,
      jwksUri: `${url}/oauth/discovery/keys`,
      audience: env.SERVER_URL,
      claims: {
        project_path: project.path_with_namespace,
        pipeline_source: "api",
        ci_config_ref_uri: `${new URL(url).host}/${project.path_with_namespace}//.gitlab-ci.yml@refs/heads/${project.default_branch}`,
      },
    });
  }

  async function release() {
    // The runner exits by itself, and the job's timeout bounds a stuck one.
  }

  return {
    name: "gitlab-ci",
    label: "GitLab CI",
    dispatch,
    authenticate,
    release,
  };
}
