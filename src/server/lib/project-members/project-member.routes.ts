import { hono } from "@server/lib/hono/hono.factory";
import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { describeRoute, validator } from "hono-openapi";

import { ProjectMemberCreateRequest } from "./project-member-create.dto";
import { ProjectMemberListRequest } from "./project-member-list.dto";
import { ProjectMemberUpdateRequest } from "./project-member-update.dto";
import { ProjectMemberParams } from "./project-member.dto";

// Mounted under /projects/:projectId/members.
export const projectMemberRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "projectMemberList",
      summary: "List the members of a project, with their project role",
    }),
    validator("param", ProjectInfoParams),
    validator("query", ProjectMemberListRequest),
    async (c) => {
      const page = await c.var.container.projectMemberListOperation.execute(
        c.req.valid("param"),
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "projectMemberCreate",
      summary: "Add a user to a project. Only Organization Admins can do this",
    }),
    validator("param", ProjectInfoParams),
    validator("json", ProjectMemberCreateRequest),
    async (c) => {
      const member = await c.var.container.projectMemberCreateOperation.execute(
        c.req.valid("param"),
        c.req.valid("json")
      );

      return c.json(member, 201);
    }
  )
  .patch(
    "/:userId",
    describeRoute({
      operationId: "projectMemberUpdate",
      summary:
        "Change the project role of a member. Only Organization Admins can do this",
    }),
    validator("param", ProjectMemberParams),
    validator("json", ProjectMemberUpdateRequest),
    async (c) => {
      const member = await c.var.container.projectMemberUpdateOperation.execute(
        c.req.valid("param"),
        c.req.valid("json")
      );

      return c.json(member);
    }
  )
  .delete(
    "/:userId",
    describeRoute({
      operationId: "projectMemberDelete",
      summary:
        "Remove a member from a project. Only Organization Admins can do this",
    }),
    validator("param", ProjectMemberParams),
    async (c) => {
      await c.var.container.projectMemberDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  );
