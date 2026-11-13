import { connectionTable } from "@server/lib/db/schema";
import type { ConnectionSelect } from "@server/lib/db/schema";
import type { githubConnection } from "@server/lib/github/github.connection";
import type { z } from "zod";

type GithubConnectionSelect = ConnectionSelect & {
  settings: z.infer<typeof githubConnection.settings>;
};

export function githubConnectionRow(
  override?: Partial<GithubConnectionSelect>
): GithubConnectionSelect {
  return {
    type: "github",
    settings: { appId: 3001, installationId: 2001 },
    secrets: JSON.stringify({
      privateKey: "github-private-key",
      webhookSecret: "github-webhook-secret",
    }),
    ...override,
  };
}

githubConnectionRow.table = connectionTable;
