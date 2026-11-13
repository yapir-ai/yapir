import type { AutomationInfoRequestDto } from "./automation-info.dto";
import { toResponseDto } from "./automation.dto";
import type { AutomationService } from "./automation.service";

export function automationInfoOperation({
  automationService,
}: {
  automationService: AutomationService;
}) {
  async function execute({ automationId }: AutomationInfoRequestDto) {
    const automation = await automationService.requireAccess(
      "read",
      automationId
    );

    return toResponseDto(automation);
  }

  return { execute };
}

export type AutomationInfoOperation = ReturnType<
  typeof automationInfoOperation
>;
