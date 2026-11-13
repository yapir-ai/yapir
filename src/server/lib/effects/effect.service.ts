import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { effectTable } from "@server/lib/db/schema";
import { forbidden } from "@server/lib/errors/error.factory";
import type {
  ResourcePresentation,
  ResourceReference,
  YapirAuthor,
} from "@server/lib/events/event-definition";
import type { ToolContext } from "@server/lib/tools/capability-definition";

function header(agentName: string) {
  return `**${agentName}**\n\n`;
}

export function effectService({ db, clock }: { db: Db; clock: Clock }) {
  async function record(
    resource: ResourceReference,
    presentation: ResourcePresentation,
    context: ToolContext
  ) {
    await db
      .insert(effectTable)
      .values({
        ...resource,
        automationId: context.automation.id,
        taskId: context.task.id,
        agentId: context.agent.id,
        agentName: context.agent.name,
        executionId: context.execution.id,
        presentation,
        createdAt: clock.now,
      })
      // A commit pushed again is already recorded.
      .onConflictDoNothing();
  }

  function withHeader(body: string, context: ToolContext) {
    return header(context.agent.name) + body;
  }

  async function author(
    resource: ResourceReference | undefined
  ): Promise<YapirAuthor | null> {
    if (!resource) {
      return null;
    }

    const effect = await db.query.effectTable.findFirst({
      columns: {
        agentId: true,
        agentName: true,
        automationId: true,
        taskId: true,
      },
      where: resource,
    });

    return effect ?? null;
  }

  async function requireThreadAuthor(
    resource: ResourceReference,
    context: ToolContext
  ) {
    const effect = await db.query.effectTable.findFirst({ where: resource });

    if (effect?.agentId !== context.agent.id) {
      throw forbidden("THREAD_NOT_OWNED");
    }
  }

  return { record, withHeader, author, requireThreadAuthor };
}

export type EffectService = ReturnType<typeof effectService>;
