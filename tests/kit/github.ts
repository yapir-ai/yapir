import { Webhooks } from "@octokit/webhooks";
import type {
  EmitterWebhookEvent,
  EmitterWebhookEventName,
} from "@octokit/webhooks";
import { expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import {
  findConnection,
  toConnection,
} from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";

// A webhook, as GitHub names it in X-GitHub-Event.
type GithubEventName = Exclude<EmitterWebhookEventName, `${string}.${string}`>;

// GitHub, as the tests see it.
export function github(db: Db, request: APIRequestContext) {
  // Delivers a webhook to Yapir, signed with the secret of the GitHub Connection.
  async function send<Name extends GithubEventName>(
    name: Name,
    payload: EmitterWebhookEvent<Name>["payload"],
    delivery: string
  ) {
    const connections = await db.query.connectionTable.findMany();
    const connection = findConnection(connections.map(toConnection), "github");
    const body = JSON.stringify(payload);

    const response = await request.post("/api/webhooks/github", {
      headers: {
        "content-type": "application/json",
        "x-github-event": name,
        "x-github-delivery": delivery,
        "x-hub-signature-256": await new Webhooks({
          secret: connection!.webhookSecret,
        }).sign(body),
      },
      data: body,
    });

    expect(response.status()).toBe(204);
  }

  return { send };
}
