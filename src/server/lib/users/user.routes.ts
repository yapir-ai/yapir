import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { UserListRequest } from "./user-list.dto";
import { UserUpdateParams, UserUpdateRequest } from "./user-update.dto";

export const userRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "userList",
      summary:
        "List the users of the organization, with their organization role",
    }),
    validator("query", UserListRequest),
    async (c) => {
      const page = await c.var.container.userListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .patch(
    "/:userId",
    describeRoute({
      operationId: "userUpdate",
      summary: "Change the organization role of a user",
    }),
    validator("param", UserUpdateParams),
    validator("json", UserUpdateRequest),
    async (c) => {
      const user = await c.var.container.userUpdateOperation.execute(
        c.req.valid("param"),
        c.req.valid("json")
      );

      return c.json(user);
    }
  );
