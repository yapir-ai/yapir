import { insertSeedAgents } from "@server/lib/agents/agent.seed";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { defaultsTable } from "@server/lib/db/schema";
import type { DefaultsSelect } from "@server/lib/db/schema";
import { badRequest } from "@server/lib/errors/error.factory";
import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { requireModelProvider } from "@server/lib/model-providers/model-provider.validator";
import { findAssistantPackage } from "@server/lib/provider-catalog/provider-catalog-list.operation";
import type { ProviderCatalogListOperation } from "@server/lib/provider-catalog/provider-catalog-list.operation";

import type { DefaultsUpdateRequestDto } from "./defaults-update.dto";
import { toResponseDto } from "./defaults.dto";

export function defaultsUpdateOperation({
  db,
  currentUser,
  providerCatalogListOperation,
}: {
  db: Db;
  currentUser: CurrentUser;
  providerCatalogListOperation: ProviderCatalogListOperation;
}) {
  async function validate({
    modelProviderId,
    model,
  }: Pick<DefaultsSelect, "modelProviderId" | "model">) {
    const { catalogId } = await requireModelProvider(db, modelProviderId);

    const npm = await findAssistantPackage(providerCatalogListOperation, {
      catalogId,
      model,
    });

    if (!npm) {
      throw badRequest("ASSISTANT_MODEL_UNSUPPORTED");
    }
  }

  async function execute(requestDto: DefaultsUpdateRequestDto) {
    await currentUser.requireAdmin();
    const current = await db.query.defaultsTable.findFirst();

    // The resulting defaults must be valid, not only the changed fields.
    const {
      modelProviderId,
      model,
      effort,
      harness = HarnessNameSchema.enum.OpenCode,
    } = { ...current, ...requestDto };

    if (!modelProviderId || !model) {
      throw badRequest("DEFAULTS_INCOMPLETE");
    }

    const values = { modelProviderId, model, effort, harness };
    await validate(values);

    const [created] = await db
      .insert(defaultsTable)
      .values(values)
      .onConflictDoNothing()
      .returning();

    if (created) {
      await insertSeedAgents(db, created);

      return toResponseDto(created);
    }

    const [updated] = await db.update(defaultsTable).set(values).returning();

    return toResponseDto(updated);
  }

  return { execute };
}
