import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import type { AddressedEventDefinition } from "@server/lib/events/event-definition";
import { yapirEvent } from "@server/lib/events/standalone-event";
import { z } from "zod";

export const taskMessageEventType = "yapir.message";

const label = "Message";

const schema = z.object({
  message: z.string(),
  userId: z.uuid().optional(),
  userName: z.string(),
});

const payloadSchema = z.object({ taskId: z.uuid(), message: z.string() });

export function taskMessageEvent({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  return {
    type: taskMessageEventType,
    label,
    capabilities: [],
    schema,
    present(data) {
      const { message, userId, userName } = schema.parse(data);

      return { actor: { name: userName, userId }, excerpt: message };
    },
    async address({ id, payload }) {
      const { taskId, message } = payloadSchema.parse(payload);

      const task = await db.query.taskTable.findFirst({
        columns: { id: true, automationId: true },
        with: {
          automation: {
            columns: { projectId: true, enabled: true, deletedAt: true },
          },
        },
        where: { id: taskId },
      });

      if (
        !task ||
        !(await currentUser.hasProjectAccess(
          "write",
          task.automation.projectId
        ))
      ) {
        throw notFound("TASK_NOT_FOUND");
      }

      if (task.automation.deletedAt) {
        throw conflict("AUTOMATION_DELETED");
      }

      if (!task.automation.enabled) {
        throw conflict("AUTOMATION_DISABLED");
      }

      const user = await currentUser.get();

      return {
        event: yapirEvent(
          id,
          "message",
          { type: taskMessageEventType, label },
          { message, userId: user.id, userName: user.name }
        ),
        targets: [{ automationId: task.automationId, task: { id: taskId } }],
      };
    },
  } satisfies AddressedEventDefinition;
}
