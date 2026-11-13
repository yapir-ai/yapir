import { hono } from "@server/lib/hono/hono.factory";
import { projectMemberRoutes } from "@server/lib/project-members/project-member.routes";
import { projectRepositoryRoutes } from "@server/lib/project-repositories/project-repository.routes";
import { describeRoute, validator } from "hono-openapi";

import { ProjectCreateRequest } from "./project-create.dto";
import { ProjectInfoParams } from "./project-info.dto";
import { ProjectListRequest } from "./project-list.dto";
import { ProjectUpdateRequest } from "./project-update.dto";

export const projectRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "projectList",
      summary:
        "List the projects you can read: each groups repositories of one Git host, with their automations, members and instructions",
    }),
    validator("query", ProjectListRequest),
    async (c) =>
      c.json(
        await c.var.container.projectListOperation.execute(c.req.valid("query"))
      )
  )
  .post(
    "/",
    describeRoute({
      operationId: "projectCreate",
      summary:
        "Create a project, without repositories. Only Organization Admins can do this",
    }),
    validator("json", ProjectCreateRequest),
    async (c) =>
      c.json(
        await c.var.container.projectCreateOperation.execute(
          c.req.valid("json")
        ),
        201
      )
  )
  .get(
    "/:projectId",
    describeRoute({ operationId: "projectInfo", summary: "Read a project" }),
    validator("param", ProjectInfoParams),
    async (c) =>
      c.json(
        await c.var.container.projectInfoOperation.execute(c.req.valid("param"))
      )
  )
  .patch(
    "/:projectId",
    describeRoute({
      operationId: "projectUpdate",
      summary:
        "Update a project's name, CI repository or instructions. Only its Project Admins and Organization Admins can do this",
    }),
    validator("param", ProjectInfoParams),
    validator("json", ProjectUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.projectUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        )
      )
  )
  .delete(
    "/:projectId",
    describeRoute({
      operationId: "projectDelete",
      summary:
        "Delete a project and its automations. Only Organization Admins can do this",
    }),
    validator("param", ProjectInfoParams),
    async (c) => {
      await c.var.container.projectDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/:projectId/restore",
    describeRoute({
      operationId: "projectRestore",
      summary:
        "Restore a deleted project, without its automations. Only Organization Admins can do this",
    }),
    validator("param", ProjectInfoParams),
    async (c) =>
      c.json(
        await c.var.container.projectRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .route("/:projectId/members", projectMemberRoutes)
  .route("/:projectId/repositories", projectRepositoryRoutes);
