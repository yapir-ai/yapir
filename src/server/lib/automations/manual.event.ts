import type { CurrentUser } from "@server/lib/auth/current-user";
import { conflict } from "@server/lib/errors/error.factory";
import type { AddressedEventDefinition } from "@server/lib/events/event-definition";
import { yapirEvent } from "@server/lib/events/standalone-event";
import { z } from "zod";

import type { AutomationService } from "./automation.service";

export const manualEventType = "yapir.manual";

const label = "Manual execution";

const schema = z.object({
  message: z.string(),
  userMessage: z.string().optional(),
  userId: z.uuid().optional(),
  userName: z.string().optional(),
});

const payloadSchema = z.object({
  automationId: z.uuid(),
  message: z.string().optional(),
});

export function manualEvent({
  automationService,
  currentUser,
}: {
  automationService: AutomationService;
  currentUser: CurrentUser;
}) {
  return {
    type: manualEventType,
    label,
    capabilities: [],
    schema,
    present(data) {
      const { userMessage, userId, userName } = schema.parse(data);

      return {
        actor: userId && userName ? { name: userName, userId } : undefined,
        excerpt: userMessage,
      };
    },
    async address({ id, payload }) {
      const { automationId, message } = payloadSchema.parse(payload);

      const automation = await automationService.requireAccess(
        "write",
        automationId
      );

      if (automation.deletedAt) {
        throw conflict("AUTOMATION_DELETED");
      }

      const user = await currentUser.get();

      return {
        event: yapirEvent(
          id,
          "manual",
          { type: manualEventType, label },
          {
            message: "A Yapir user started this execution manually.",
            userId: user.id,
            userName: user.name,
            ...(message && { userMessage: message }),
          }
        ),
        targets: [{ automationId, task: null }],
      };
    },
  } satisfies AddressedEventDefinition;
}
