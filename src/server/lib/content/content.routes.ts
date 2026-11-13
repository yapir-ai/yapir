import { notFound } from "@server/lib/errors/error.factory";
import type { HonoEnv } from "@server/lib/hono/hono.factory";
import { hono } from "@server/lib/hono/hono.factory";
import type { Context } from "hono";

function markdown(c: Context<HonoEnv>, document: string) {
  return c.body(document, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  });
}

export const contentRoutes = hono()
  .get("/", (c) => {
    const { content, env } = c.var.container;

    return markdown(c, content.list(env.SERVER_URL));
  })
  .get("/:path{.+}", (c) => {
    const { content, env } = c.var.container;
    const document = content.info(c.req.param("path"), env.SERVER_URL);

    if (!document) {
      throw notFound("CONTENT_NOT_FOUND");
    }

    return markdown(c, document);
  });
