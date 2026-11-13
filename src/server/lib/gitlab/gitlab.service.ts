import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { ApiEnv } from "@server/lib/env";
import type { z } from "zod";

type Query = Record<string, string | number | boolean | number[] | undefined>;

// The Connection URL stays the host of clone URLs, webhooks and links.
export function gitlabApiUrl(
  connection: ConnectionOf<"gitlab">,
  { GITLAB_API_URL }: Pick<ApiEnv, "GITLAB_API_URL">
) {
  return GITLAB_API_URL ?? connection.url;
}

export function gitlabService(
  connection: ConnectionOf<"gitlab">,
  env: Pick<ApiEnv, "GITLAB_API_URL">
) {
  const baseUrl = `${gitlabApiUrl(connection, env)}/api/v4`;

  async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    {
      method = "GET",
      query = {},
      body,
    }: { method?: string; query?: Query; body?: unknown } = {}
  ) {
    const url = new URL(`${baseUrl}${path}`);

    for (const [key, value] of Object.entries(query)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item !== undefined) {
          url.searchParams.append(
            Array.isArray(value) ? `${key}[]` : key,
            String(item)
          );
        }
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        "private-token": connection.token,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `GitLab ${method} ${path} failed with ${response.status}: ${await response.text()}`
      );
    }

    return schema.parse(response.status === 204 ? null : await response.json());
  }

  return { request };
}

export type GitlabService = ReturnType<typeof gitlabService>;
