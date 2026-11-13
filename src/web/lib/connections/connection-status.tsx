import { Status } from "@web/components/ui/status";
import { CircleCheck, CircleDashed } from "lucide-react";

export function ConnectionStatus({ connected }: { connected: boolean }) {
  return connected ? (
    <Status tone="success">
      <CircleCheck aria-hidden="true" />
      Connected
    </Status>
  ) : (
    <Status tone="muted">
      <CircleDashed aria-hidden="true" />
      Not connected
    </Status>
  );
}
