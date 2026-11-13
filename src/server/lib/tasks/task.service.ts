import type { Clock } from "@server/lib/clock/clock";
import type { Db, Transaction } from "@server/lib/db";
import {
  agentTable,
  automationTable,
  projectTable,
  taskAssociationTable,
  taskTable,
} from "@server/lib/db/schema";
import type { TaskSelect } from "@server/lib/db/schema";
import {
  conflict,
  forbidden,
  notFound,
} from "@server/lib/errors/error.factory";
import type {
  EventResource,
  ResourceReference,
  ResourcePresentation,
} from "@server/lib/events/event-definition";
import { and, eq, or, sql } from "drizzle-orm";

export type AssociationScope = "task" | "automation";

export function taskService({ db, clock }: { db: Db; clock: Clock }) {
  const matching = (resource: ResourceReference) =>
    and(
      eq(taskAssociationTable.integration, resource.integration),
      eq(taskAssociationTable.host, resource.host),
      eq(taskAssociationTable.kind, resource.kind),
      eq(taskAssociationTable.externalId, resource.externalId)
    );

  async function findAssociatedTask(
    automationId: string,
    resource: ResourceReference
  ) {
    return await db.query.taskAssociationTable.findFirst({
      columns: { taskId: true, presentation: true },
      where: { automationId, ...resource },
    });
  }

  async function findAssociatedTasks(
    automationId: string,
    resources: EventResource[]
  ) {
    return await db
      .selectDistinct({ id: taskAssociationTable.taskId })
      .from(taskAssociationTable)
      .where(
        and(
          eq(taskAssociationTable.automationId, automationId),
          or(...resources.map(({ reference }) => matching(reference)))
        )
      );
  }

  async function load(taskId: string) {
    const [context] = await db
      .select({
        task: taskTable,
        agent: agentTable,
        automation: automationTable,
        project: projectTable,
      })
      .from(taskTable)
      .innerJoin(
        automationTable,
        eq(automationTable.id, taskTable.automationId)
      )
      .innerJoin(agentTable, eq(agentTable.id, automationTable.agentId))
      .innerJoin(projectTable, eq(projectTable.id, automationTable.projectId))
      .where(eq(taskTable.id, taskId));

    if (!context) {
      throw notFound("TASK_NOT_FOUND");
    }

    const repositories = await db.query.repositoryTable.findMany({
      where: { projects: { id: context.project.id } },
      orderBy: { path: "asc" },
    });

    return { ...context, repositories };
  }

  async function associate(
    task: Pick<TaskSelect, "id" | "automationId">,
    resource: ResourceReference,
    presentation: ResourcePresentation
  ) {
    await db.transaction(async (tx) => {
      await lockAutomation(tx, task.automationId);
      await tx
        .insert(taskAssociationTable)
        .values({
          ...resource,
          automationId: task.automationId,
          taskId: task.id,
          presentation,
          createdAt: clock.now,
        })
        .onConflictDoNothing();
    });
    const association = await findAssociatedTask(task.automationId, resource);

    if (association?.taskId !== task.id) {
      throw conflict("RESOURCE_ALREADY_ASSOCIATED");
    }

    await rememberPresentation(task.id, { reference: resource, presentation });
  }

  async function requireAssociation(
    task: Pick<TaskSelect, "id" | "automationId">,
    resource: ResourceReference,
    scope: AssociationScope
  ) {
    const association = await findAssociatedTask(task.automationId, resource);

    if (!association || (scope === "task" && association.taskId !== task.id)) {
      throw forbidden("RESOURCE_OUT_OF_SCOPE");
    }

    return association.presentation;
  }

  // An unscoped call reaches resources without association: its presentation comes from the provider.
  async function requireScoped(
    {
      task,
      unscoped,
    }: { task: Pick<TaskSelect, "id" | "automationId">; unscoped: boolean },
    resource: ResourceReference,
    scope: AssociationScope,
    unscopedPresentation: () =>
      | Promise<ResourcePresentation>
      | ResourcePresentation
  ) {
    return unscoped
      ? await unscopedPresentation()
      : await requireAssociation(task, resource, scope);
  }

  async function associatedExternalIds(
    task: Pick<TaskSelect, "automationId">,
    resource: Pick<ResourceReference, "integration" | "host" | "kind">
  ) {
    const associations = await db.query.taskAssociationTable.findMany({
      columns: { externalId: true },
      where: {
        automationId: task.automationId,
        integration: resource.integration,
        host: resource.host,
        kind: resource.kind,
      },
    });

    return new Set(associations.map(({ externalId }) => externalId));
  }

  // The last-known presentation: a field it lacks keeps its known value.
  async function rememberPresentation(
    taskId: string,
    { reference, presentation }: EventResource
  ) {
    await db
      .update(taskAssociationTable)
      .set({
        presentation: sql`${taskAssociationTable.presentation} || ${JSON.stringify(presentation)}::jsonb`,
      })
      .where(and(eq(taskAssociationTable.taskId, taskId), matching(reference)));
  }

  async function rememberPresentations(
    taskId: string,
    resources: EventResource[]
  ) {
    for (const resource of resources) {
      await rememberPresentation(taskId, resource);
    }
  }

  // The automation's row lock serializes the creations of its tasks and their associations: two deliveries about a new resource end on one task.
  async function lockAutomation(tx: Transaction, automationId: string) {
    await tx
      .select({ id: automationTable.id })
      .from(automationTable)
      .where(eq(automationTable.id, automationId))
      .for("update");
  }

  async function createTask(
    tx: Transaction,
    automationId: string,
    resources: EventResource[],
    now: Date
  ) {
    await lockAutomation(tx, automationId);

    const existing = await tx.query.taskAssociationTable.findFirst({
      columns: { taskId: true },
      where: { automationId, ...resources[0]!.reference },
    });

    if (existing) {
      return existing.taskId;
    }

    const [created] = await tx
      .insert(taskTable)
      .values({
        automationId,
        state: "idle",
        createdAt: now,
        stateChangedAt: now,
      })
      .returning({ id: taskTable.id });

    const { id } = created!;

    await tx
      .insert(taskAssociationTable)
      .values(
        resources.map(({ reference, presentation }) => ({
          automationId,
          taskId: id,
          ...reference,
          presentation,
          createdAt: now,
        }))
      )
      .onConflictDoNothing();

    return id;
  }

  return {
    findAssociatedTasks,
    createTask,
    rememberPresentations,
    load,
    associate,
    requireAssociation,
    requireScoped,
    associatedExternalIds,
  };
}

export type TaskService = ReturnType<typeof taskService>;

export type TaskContext = Awaited<ReturnType<TaskService["load"]>>;

export function requireRepository(
  { repositories }: Pick<TaskContext, "repositories">,
  path: string
) {
  const repository = repositories.find((candidate) => candidate.path === path);

  if (!repository) {
    throw forbidden("REPOSITORY_OUT_OF_SCOPE");
  }

  return repository;
}
