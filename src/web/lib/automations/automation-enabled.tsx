import { Status } from "@web/components/ui/status";
import { Power, PowerOff } from "lucide-react";

export function AutomationEnabled({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Status tone="success">
      <Power aria-hidden="true" /> Enabled
    </Status>
  ) : (
    <Status tone="muted">
      <PowerOff aria-hidden="true" /> Disabled
    </Status>
  );
}
