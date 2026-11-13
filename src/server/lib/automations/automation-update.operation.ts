import type { Db } from "@server/lib/db";
import { automationTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { conflict } from "@server/lib/errors/error.factory";
import { and, eq, isNull } from "drizzle-orm";

import type { AutomationInfoRequestDto } from "./automation-info.dto";
import type { AutomationUpdateRequestDto } from "./automation-update.dto";
import { toResponseDto } from "./automation.dto";
import type { AutomationService } from "./automation.service";
import type { AutomationValidator } from "./automation.validator";

export function automationUpdateOperation({
  db,
  automationService,
  automationValidator,
}: {
  db: Db;
  automationService: AutomationService;
  automationValidator: AutomationValidator;
}) {
  async function execute(
    { automationId }: AutomationInfoRequestDto,
    request: AutomationUpdateRequestDto
  ) {
    const current = await automationService.requireAccess(
      "write",
      automationId
    );

    if (current.deletedAt) {
      throw conflict("AUTOMATION_DELETED");
    }

    if (!hasAnyChange(request)) {
      return toResponseDto(current);
    }

    // The resulting automation must be valid, not only the changed fields. Granted capabilities can leave the registry, such as the tools of a deleted MCP server: only new ones must exist.
    await automationValidator.validate({
      ...current,
      ...request,
      capabilities:
        request.capabilities?.filter(
          ({ name }) =>
            !current.capabilities.some((granted) => granted.name === name)
        ) ?? [],
    });

    const [automation] = await db
      .update(automationTable)
      .set(request)
      .where(
        and(
          eq(automationTable.id, automationId),
          isNull(automationTable.deletedAt)
        )
      )
      .returning();

    if (!automation) {
      throw conflict("AUTOMATION_DELETED");
    }

    return toResponseDto(automation);
  }

  return { execute };
}
