import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";
import { unauthorized } from "@server/lib/errors/error.factory";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";
import { importRepositories } from "@server/lib/repositories/repository-import";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { z } from "zod";

const deliverySchema = z.object({
  object_kind: z.string(),
  action: z.string().optional(),
  object_attributes: z.object({ action: z.string().optional() }).optional(),
  project: z.object({ id: z.number(), path_with_namespace: z.string() }),
});

export function gitlabWebhookDispatch(
  connection: ConnectionOf<"gitlab">,
  {
    db,
    host,
    eventProcessOperation,
  }: {
    db: Db;
    host: string;
    eventProcessOperation: EventProcessOperation;
  }
) {
  async function verify(request: Request) {
    try {
      return new Webhook(connection.webhookSigningToken).verify(
        await request.text(),
        Object.fromEntries(request.headers)
      );
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw unauthorized("WEBHOOK_SIGNATURE_INVALID");
      }

      throw error;
    }
  }

  async function execute(request: Request) {
    const payload = await verify(request);

    const { object_kind, action, object_attributes, project } =
      deliverySchema.parse(payload);

    await importRepositories(db, [
      {
        provider: "gitlab",
        host,
        externalId: String(project.id),
        path: project.path_with_namespace,
      },
    ]);
    const deliveryAction = object_attributes?.action ?? action;

    const type = deliveryAction
      ? `gitlab.${object_kind}.${deliveryAction}`
      : `gitlab.${object_kind}`;

    // The delivery's stable ID, kept across retries.
    const id = request.headers.get("webhook-id")!;
    await eventProcessOperation.execute({ id, type, payload });
  }

  return { execute };
}
