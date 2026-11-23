import type { TaskLifecycle } from "@server/lib/tasks/task-lifecycle";
import type { TaskService } from "@server/lib/tasks/task.service";

import type {
  EventNotification,
  EventRegistry,
  EventTarget,
  PreparedEvent,
  TriggerEventDefinition,
} from "./event-definition";

export function eventProcessOperation({
  eventRegistry,
  taskService,
  taskLifecycle,
}: {
  eventRegistry: Promise<EventRegistry>;
  taskService: TaskService;
  taskLifecycle: TaskLifecycle;
}) {
  async function execute(notification: EventNotification) {
    const definition = (await eventRegistry).get(notification.type);

    // Providers deliver webhooks that Yapir has no event for.
    if (!definition) {
      return [];
    }

    const { event, targets } =
      "address" in definition
        ? await definition.address(notification)
        : await triggered(definition, notification);

    const accepted = [];

    for (const { automationId, task } of targets) {
      const taskId = await accept(automationId, event, task);
      accepted.push({ taskId, eventId: event.id });
    }

    return accepted;
  }

  async function triggered(
    definition: TriggerEventDefinition,
    notification: EventNotification
  ) {
    const event = await definition.prepare(notification);
    const targets: EventTarget[] = [];

    for (const automation of await definition.findCandidates(event)) {
      if (event.author?.automationId === automation.id) {
        continue;
      }

      const tasks = await taskService.findAssociatedTasks(
        automation.id,
        event.resources
      );

      // An event that continues no task may start one.
      for (const task of tasks.length > 0 ? tasks : [null]) {
        const matches = automation.triggers.some(
          (trigger) =>
            trigger.type === event.type &&
            definition.filter.matches(trigger, event, task)
        );

        if (matches) {
          targets.push({ automationId: automation.id, task });
        }
      }
    }

    return { event, targets };
  }

  async function accept(
    automationId: string,
    event: PreparedEvent,
    associated: { id: string } | null
  ) {
    if (associated) {
      await taskService.rememberPresentations(associated.id, event.resources);
    }

    return await taskLifecycle.accept(
      associated
        ? { taskId: associated.id }
        : { automationId, resources: event.resources },
      event
    );
  }

  return { execute };
}

export type EventProcessOperation = ReturnType<typeof eventProcessOperation>;
