import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { ModelProviderCreateRequest } from "./model-provider-create.dto";
import { ModelProviderInfoParams } from "./model-provider-info.dto";
import { ModelProviderListRequest } from "./model-provider-list.dto";
import { ModelProviderUpdateRequest } from "./model-provider-update.dto";

export const modelProviderRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "modelProviderList",
      summary:
        "List model providers: the organization access to a source of models, with its endpoint and API key",
    }),
    validator("query", ModelProviderListRequest),
    async (c) => {
      const page = await c.var.container.modelProviderListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .get(
    "/:modelProviderId",
    describeRoute({
      operationId: "modelProviderInfo",
      summary: "Read a model provider, without its API key",
    }),
    validator("param", ModelProviderInfoParams),
    async (c) => {
      const modelProvider =
        await c.var.container.modelProviderInfoOperation.execute(
          c.req.valid("param")
        );

      return c.json(modelProvider);
    }
  )
  .post(
    "/:modelProviderId/restore",
    describeRoute({
      operationId: "modelProviderRestore",
      summary: "Restore a deleted model provider",
    }),
    validator("param", ModelProviderInfoParams),
    async (c) =>
      c.json(
        await c.var.container.modelProviderRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:modelProviderId",
    describeRoute({
      operationId: "modelProviderUpdate",
      summary: "Update a model provider",
    }),
    validator("param", ModelProviderInfoParams),
    validator("json", ModelProviderUpdateRequest),
    async (c) => {
      const modelProvider =
        await c.var.container.modelProviderUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        );

      return c.json(modelProvider);
    }
  )
  .delete(
    "/:modelProviderId",
    describeRoute({
      operationId: "modelProviderDelete",
      summary:
        "Delete a model provider that no agent and not the Assistant uses",
    }),
    validator("param", ModelProviderInfoParams),
    async (c) => {
      await c.var.container.modelProviderDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "modelProviderCreate",
      summary: "Create a model provider",
    }),
    validator("json", ModelProviderCreateRequest),
    async (c) => {
      const modelProvider =
        await c.var.container.modelProviderCreateOperation.execute(
          c.req.valid("json")
        );

      return c.json(modelProvider, 201);
    }
  );
