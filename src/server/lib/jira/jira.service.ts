import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { ApiEnv } from "@server/lib/env";
import type { z } from "zod";

import { jiraUserSchema } from "./jira-event";

type JiraPage<T> = z.ZodType<{ total: number; items: T[] }>;

// Jira Cloud's REST API v2, through the Atlassian API gateway as Yapir's service account.
export function jiraService(
  connection: ConnectionOf<"jira">,
  { JIRA_API_URL = "https://api.atlassian.com" }: Pick<ApiEnv, "JIRA_API_URL">
) {
  const baseUrl = `${JIRA_API_URL}/ex/jira/${connection.cloudId}/rest/api/2`;

  async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    { method = "GET", body }: { method?: string; body?: unknown } = {}
  ) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${connection.apiToken}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Jira ${method} ${path} failed with ${response.status}: ${await response.text()}`
      );
    }

    return schema.parse(response.status === 204 ? null : await response.json());
  }

  async function list<T>(path: string, pageSchema: JiraPage<T>) {
    const items: T[] = [];

    for (;;) {
      const page = await request(
        `${path}?startAt=${items.length}&maxResults=100`,
        pageSchema
      );

      items.push(...page.items);

      if (items.length >= page.total) {
        return items;
      }
    }
  }

  async function myself() {
    return await request("/myself", jiraUserSchema);
  }

  return { request, list, myself };
}

export type JiraService = ReturnType<typeof jiraService>;
