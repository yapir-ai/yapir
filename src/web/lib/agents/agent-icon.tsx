import type { AgentResponseDto } from "@server/lib/agents/agent.dto";
import { avatarColors } from "@web/lib/avatars/avatar-colors";
import Avatar from "boring-avatars";

const sizes = { xs: 20, sm: 32, default: 40 };

export function AgentIcon({
  agent,
  size = "default",
}: {
  agent: Pick<AgentResponseDto, "id">;
  size?: keyof typeof sizes;
}) {
  return (
    <Avatar
      variant="beam"
      name={agent.id}
      size={sizes[size]}
      aria-hidden="true"
      colors={avatarColors}
    />
  );
}
