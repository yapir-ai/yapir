import { CopyButton } from "@web/components/copy-button";

import type { Skill } from "./skill.collection";

export function SkillInstallButton({
  skill,
}: {
  skill: Pick<Skill, "id" | "name">;
}) {
  return (
    <CopyButton
      text={`Install the ${skill.name} skill from Yapir: yapir skill info ${skill.id}`}
    >
      Copy install prompt
    </CopyButton>
  );
}
