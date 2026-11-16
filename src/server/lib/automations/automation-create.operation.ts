import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { automationTable } from "@server/lib/db/schema";
import type { TriggerEventRegistry } from "@server/lib/events/event-definition";
import { executionEnvironment } from "@server/lib/executions/dispatcher";
import type { Dispatchers } from "@server/lib/executions/dispatcher";
import { fitsProject } from "@server/lib/git/repository-provider";
import type { RepositoryProvider } from "@server/lib/git/repository-provider";
import { requireProjectAccess } from "@server/lib/projects/project.validator";
import type { CapabilityRegistry } from "@server/lib/tools/capability-definition";

import type { AutomationCreateRequestDto } from "./automation-create.dto";
import { toResponseDto } from "./automation.dto";
import type { AutomationValidator } from "./automation.validator";

export function automationCreateOperation({
  db,
  currentUser,
  automationValidator,
  dispatchers,
  triggerEventRegistry,
  capabilityRegistry,
}: {
  db: Db;
  currentUser: CurrentUser;
  automationValidator: AutomationValidator;
  dispatchers: Promise<Dispatchers>;
  triggerEventRegistry: Promise<TriggerEventRegistry>;
  capabilityRegistry: Promise<CapabilityRegistry>;
}) {
  async function agentDefaults(
    agentId: string,
    project: { repositories: { provider: RepositoryProvider }[] }
  ) {
    const [agent, events, capabilities] = await Promise.all([
      db.query.agentTable.findFirst({
        columns: { triggers: true, capabilities: true },
        where: { id: agentId },
      }),
      triggerEventRegistry,
      capabilityRegistry,
    ]);

    const fits = (definition?: { gitHost?: RepositoryProvider }) =>
      definition !== undefined && fitsProject(definition, project);

    return {
      triggers: (agent?.triggers ?? []).filter(({ type }) =>
        fits(events.get(type))
      ),
      capabilities: (agent?.capabilities ?? []).filter(({ name }) =>
        fits(capabilities.get(name))
      ),
    };
  }

  async function execute(request: AutomationCreateRequestDto) {
    const project = await requireProjectAccess(
      db,
      currentUser,
      "write",
      request.projectId
    );

    const { dispatcher, ciRepositoryId } = executionEnvironment(
      [...(await dispatchers).values()],
      project,
      request
    );

    const defaults = await agentDefaults(request.agentId, project);

    const automation = {
      name: request.name,
      agentId: request.agentId,
      projectId: request.projectId,
      ciRepositoryId,
      instructions: request.instructions,
      triggers: request.triggers ?? defaults.triggers,
      capabilities: request.capabilities ?? defaults.capabilities,
      dispatcher,
    };

    await automationValidator.validate({ ...automation, enabled: false });

    const [created] = await db
      .insert(automationTable)
      .values({ id: request.id, ...automation })
      .returning();

    return toResponseDto(created!);
  }

  return { execute };
}

export type AutomationCreateOperation = ReturnType<
  typeof automationCreateOperation
>;
