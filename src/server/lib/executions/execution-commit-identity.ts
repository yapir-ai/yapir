import type { AutomationSelect } from "@server/lib/db/schema";

// Reserved TLD: the address only names the automation in the Git history.
const domain = "automations.yapir.invalid";

export function automationCommitIdentity(
  automation: Pick<AutomationSelect, "id" | "name">
) {
  return { name: automation.name, email: `${automation.id}@${domain}` };
}
