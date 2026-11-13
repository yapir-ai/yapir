import { hono } from "@server/lib/hono/hono.factory";
import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { describeRoute, validator } from "hono-openapi";

import { ProjectRepositoryCreateRequest } from "./project-repository-create.dto";
import { ProjectRepositoryListRequest } from "./project-repository-list.dto";
import { ProjectRepositoryParams } from "./project-repository.dto";

// Mounted under /projects/:projectId/repositories.
export const projectRepositoryRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "projectRepositoryList",
      summary:
        "List the repositories of a project: its automations work on all of them",
    }),
    validator("param", ProjectInfoParams),
    validator("query", ProjectRepositoryListRequest),
    async (c) =>
      c.json(
        await c.var.container.projectRepositoryListOperation.execute(
          c.req.valid("param"),
          c.req.valid("query")
        )
      )
  )
  .post(
    "/",
    describeRoute({
      operationId: "projectRepositoryCreate",
      summary:
        "Add a repository to a project. Only Organization Admins can do this",
    }),
    validator("param", ProjectInfoParams),
    validator("json", ProjectRepositoryCreateRequest),
    async (c) =>
      c.json(
        await c.var.container.projectRepositoryCreateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        ),
        201
      )
  )
  .delete(
    "/:repositoryId",
    describeRoute({
      operationId: "projectRepositoryDelete",
      summary:
        "Remove a repository from a project, unless an automation of the project runs its executions in its CI. Only Organization Admins can do this",
    }),
    validator("param", ProjectRepositoryParams),
    async (c) => {
      await c.var.container.projectRepositoryDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  );
