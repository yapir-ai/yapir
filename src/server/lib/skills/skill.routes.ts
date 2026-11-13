import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { SkillCreateRequest } from "./skill-create.dto";
import { SkillInfoParams } from "./skill-info.dto";
import { SkillListRequest } from "./skill-list.dto";
import { SkillUpdateRequest } from "./skill-update.dto";

export const skillRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "skillList",
      summary:
        "List skills: instructions shared with the organization, which users install in their own harness",
    }),
    validator("query", SkillListRequest),
    async (c) =>
      c.json(
        await c.var.container.skillListOperation.execute(c.req.valid("query"))
      )
  )
  .get(
    "/:skillId",
    describeRoute({
      operationId: "skillInfo",
      summary:
        "Read a skill: the name and description of its SKILL.md frontmatter, and its instructions, the SKILL.md body",
    }),
    validator("param", SkillInfoParams),
    async (c) =>
      c.json(
        await c.var.container.skillInfoOperation.execute(c.req.valid("param"))
      )
  )
  .post(
    "/:skillId/restore",
    describeRoute({
      operationId: "skillRestore",
      summary:
        "Restore a deleted skill. Only its author or an Organization Admin can do this",
    }),
    validator("param", SkillInfoParams),
    async (c) =>
      c.json(
        await c.var.container.skillRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:skillId",
    describeRoute({
      operationId: "skillUpdate",
      summary:
        "Update a skill. Only its author or an Organization Admin can do this",
    }),
    validator("param", SkillInfoParams),
    validator("json", SkillUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.skillUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        )
      )
  )
  .delete(
    "/:skillId",
    describeRoute({
      operationId: "skillDelete",
      summary:
        "Delete a skill. Only its author or an Organization Admin can do this",
    }),
    validator("param", SkillInfoParams),
    async (c) => {
      await c.var.container.skillDeleteOperation.execute(c.req.valid("param"));

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "skillCreate",
      summary: "Create a skill, with the current user as its author",
    }),
    validator("json", SkillCreateRequest),
    async (c) =>
      c.json(
        await c.var.container.skillCreateOperation.execute(c.req.valid("json")),
        201
      )
  );
