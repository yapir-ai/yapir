import { frontmatter } from "@server/lib/content/frontmatter";
import { client } from "@web/lib/api";
import { parseResponse } from "hono/client";

export async function loadContent(path: string) {
  const markdown = await parseResponse(
    client.api.content[":path{.+}"].$get({ param: { path } })
  );

  return frontmatter(markdown).body;
}
