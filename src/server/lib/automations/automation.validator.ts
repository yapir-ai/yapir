import type { Db } from "@server/lib/db";
import type { AutomationSelect } from "@server/lib/db/schema";
import {
  badRequest,
  conflict,
  notFound,
} from "@server/lib/errors/error.factory";
import type { TriggerEventRegistry } from "@server/lib/events/event-definition";
import type { Dispatchers } from "@server/lib/executions/dispatcher";
import { fitsProject } from "@server/lib/git/repository-provider";
import { requireProject } from "@server/lib/projects/project.validator";
import type { CapabilityRegistry } from "@server/lib/tools/capability-definition";

import type { Trigger } from "./automation.dto";

export function automationValidator({
  db,
  triggerEventRegistry,
  capabilityRegistry,
  dispatchers,
}: {
  db: Db;
  triggerEventRegistry: Promise<TriggerEventRegistry>;
  capabilityRegistry: Promise<CapabilityRegistry>;
  dispatchers: Promise<Dispatchers>;
}) {
  async function validateTrigger(trigger: Trigger) {
    const definition = (await triggerEventRegistry).get(trigger.type);

    if (!definition) {
      throw badRequest("UNKNOWN_EVENT_TYPE");
    }

    const reason = definition.filter.check(trigger);

    if (reason) {
      throw badRequest("INVALID_TRIGGER_FILTER", reason);
    }

    return definition;
  }

  async function validate({
    agentId,
    projectId,
    ciRepositoryId,
    enabled,
    triggers,
    capabilities,
    dispatcher,
  }: Pick<
    AutomationSelect,
    | "agentId"
    | "projectId"
    | "ciRepositoryId"
    | "enabled"
    | "triggers"
    | "capabilities"
    | "dispatcher"
  >) {
    if (enabled && triggers.length === 0) {
      throw badRequest("AUTOMATION_REQUIRES_TRIGGER");
    }

    const project = await requireProject(db, projectId);

    if (project.deletedAt) {
      throw conflict("PROJECT_DELETED");
    }

    for (const trigger of triggers) {
      if (!fitsProject(await validateTrigger(trigger), project)) {
        throw badRequest("GIT_HOST_MISMATCH");
      }
    }

    for (const { name } of capabilities) {
      const definition = (await capabilityRegistry).get(name);

      if (!definition) {
        throw badRequest("UNKNOWN_CAPABILITY");
      }

      if (!fitsProject(definition, project)) {
        throw badRequest("GIT_HOST_MISMATCH");
      }
    }

    const dispatcherDefinition = (await dispatchers).get(dispatcher);

    if (!dispatcherDefinition) {
      throw badRequest("UNKNOWN_DISPATCHER");
    }

    if (!fitsProject(dispatcherDefinition, project)) {
      throw badRequest("GIT_HOST_MISMATCH");
    }

    if (
      (ciRepositoryId !== null || dispatcherDefinition.gitHost !== undefined) &&
      !project.repositories.some(({ id }) => id === ciRepositoryId)
    ) {
      throw badRequest("CI_REPOSITORY_INVALID");
    }

    const agent = await db.query.agentTable.findFirst({
      columns: { id: true, deletedAt: true },
      where: { id: agentId },
    });

    if (!agent) {
      throw notFound("AGENT_NOT_FOUND");
    }

    if (agent.deletedAt) {
      throw conflict("AGENT_DELETED");
    }
  }

  return { validate, validateTrigger };
}

export type AutomationValidator = ReturnType<typeof automationValidator>;
