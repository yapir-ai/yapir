import { apiPath } from "@server/lib/executions/runner-path";
import { SkillsApiGroup } from "@server/lib/skills/skill.api";
import { HttpApi } from "effect/http-api";

export const YapirApi = HttpApi.make("yapir")
  .add(SkillsApiGroup)
  .prefix(apiPath);
