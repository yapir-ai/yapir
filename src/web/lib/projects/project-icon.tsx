import { avatarColors } from "@web/lib/avatars/avatar-colors";
import type { Project } from "@web/lib/projects/project.collection";
import BoringAvatar from "boring-avatars";

const sizes = { "2xs": 12, xs: 20, default: 40 };

export function ProjectIcon({
  project,
  size = "default",
}: {
  project: Pick<Project, "id">;
  size?: keyof typeof sizes;
}) {
  return (
    <BoringAvatar
      variant="bauhaus"
      name={project.id}
      size={sizes[size]}
      square
      className="rounded-sm"
      aria-hidden="true"
      colors={avatarColors}
    />
  );
}
