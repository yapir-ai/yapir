import { createPrivateKey } from "node:crypto";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { ApiEnv } from "@server/lib/env";

export function githubRepository(path: string) {
  const [owner, repo] = path.split("/");

  return { owner: owner!, repo: repo! };
}

export function githubService(
  connection: ConnectionOf<"github">,
  { GITHUB_API_URL: baseUrl }: Pick<ApiEnv, "GITHUB_API_URL">
) {
  async function installationToken() {
    const auth = createAppAuth({
      appId: connection.appId,
      privateKey: createPrivateKey(connection.privateKey)
        .export({ format: "pem", type: "pkcs8" })
        .toString(),
      installationId: connection.installationId,
      request: new Octokit({ baseUrl }).request,
    });

    const { token } = await auth({
      type: "installation",
    });

    return token;
  }

  async function client() {
    return new Octokit({
      auth: await installationToken(),
      baseUrl,
    });
  }

  return { installationToken, client };
}

export type GithubService = ReturnType<typeof githubService>;
