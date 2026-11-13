import { Webhooks } from "@octokit/webhooks";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import { unauthorized } from "@server/lib/errors/error.factory";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";

import type { GithubInstallationOperation } from "./github-installation.operation.ts";

export function githubWebhookDispatch(
  connection: ConnectionOf<"github">,
  {
    githubInstallationOperation,
    eventProcessOperation,
  }: {
    githubInstallationOperation: GithubInstallationOperation;
    eventProcessOperation: EventProcessOperation;
  }
) {
  const webhooks = new Webhooks({ secret: connection.webhookSecret });

  webhooks.on(
    ["installation.created", "installation_repositories.added"],
    async ({ payload }) => {
      if (payload.installation.id === connection.installationId) {
        await githubInstallationOperation.execute(payload);
      }
    }
  );

  // Any other delivery is the event of its webhook and action.
  webhooks.onAny(async ({ id, name, payload }) => {
    const type =
      "action" in payload
        ? `github.${name}.${payload.action}`
        : `github.${name}`;

    if (
      "installation" in payload &&
      payload.installation?.id === connection.installationId
    ) {
      await eventProcessOperation.execute({ id, type, payload });
    }
  });

  async function execute(request: Request) {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256") ?? "";

    // Like verifyAndReceive, a missing or malformed signature is not a match.
    const isSigned = await webhooks
      .verify(payload, signature)
      .catch(() => false);

    if (!isSigned) {
      throw unauthorized("WEBHOOK_SIGNATURE_INVALID");
    }

    // SAFETY: GitHub signed this payload, and its header names the event of the payload.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    await webhooks.receive({
      id: request.headers.get("x-github-delivery") ?? "",
      name: request.headers.get("x-github-event") ?? "",
      payload: JSON.parse(payload) as unknown,
    } as EmitterWebhookEvent);
  }

  return { execute };
}
