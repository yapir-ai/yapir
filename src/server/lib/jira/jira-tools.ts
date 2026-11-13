import type { EffectService } from "@server/lib/effects/effect.service";
import type {
  AssociationScope,
  TaskService,
} from "@server/lib/tasks/task.service";
import { tool } from "@server/lib/tools/capability-definition";
import type { ToolCallContext } from "@server/lib/tools/capability-definition";
import { z } from "zod";

import {
  jiraChangelogItemSchema,
  jiraCommentSchema,
  jiraIssueDetailsSchema,
  jiraUserSchema,
} from "./jira-event";
import type { JiraSite } from "./jira-event";
import type { JiraService } from "./jira.service";

const issueSchema = jiraIssueDetailsSchema.extend({
  fields: jiraIssueDetailsSchema.shape.fields.extend({
    created: z.string(),
    updated: z.string(),
  }),
});

const changelogPageSchema = z
  .object({
    total: z.number(),
    values: z.array(
      z.object({
        id: z.string(),
        author: jiraUserSchema.pick({ accountId: true }),
        items: z.array(jiraChangelogItemSchema),
      })
    ),
  })
  .transform(({ total, values }) => ({ total, items: values }));

const issueIdOrKey = z
  .string()
  .min(1)
  .describe("An issue ID or key, such as KAN-12");

const fields = Object.keys(issueSchema.shape.fields.shape).join(",");

export function jiraTools({
  site,
  jiraService,
  taskService,
  effectService,
}: {
  site: JiraSite;
  jiraService: JiraService;
  taskService: TaskService;
  effectService: EffectService;
}) {
  const { request } = jiraService;

  async function requireIssue(
    { task, unscoped }: ToolCallContext,
    key: string,
    scope: AssociationScope
  ) {
    const issue = await request(
      `/issue/${encodeURIComponent(key)}?fields=${fields}`,
      issueSchema
    );

    if (!unscoped) {
      await taskService.requireAssociation(
        task,
        site.reference("issue", issue.id),
        scope
      );
    }

    return issue;
  }

  const issueGet = tool({
    name: "jira_issue_get",
    description:
      "Get an issue, as Jira's GET /rest/api/2/issue/{issueIdOrKey}.",
    inputSchema: z.object({ issueIdOrKey }),
    execute: async ({ issueIdOrKey: key }, context) =>
      await requireIssue(context, key, "automation"),
  });

  const searchJql = tool({
    name: "jira_search_jql",
    description:
      "Search issues with a bounded JQL query, as Jira's GET /rest/api/2/search/jql. Follow nextPageToken to the next page.",
    inputSchema: z.object({
      jql: z.string().min(1),
      maxResults: z.number().int().min(1).max(100).optional(),
      nextPageToken: z.string().optional(),
    }),
    async execute({ jql, maxResults, nextPageToken }, { task, unscoped }) {
      const query = new URLSearchParams({
        jql,
        fields,
        ...(maxResults && { maxResults: String(maxResults) }),
        ...(nextPageToken && { nextPageToken }),
      });

      const page = await request(
        `/search/jql?${query.toString()}`,
        z.object({
          issues: z.array(issueSchema),
          nextPageToken: z.string().optional(),
        })
      );

      if (unscoped) {
        return page;
      }

      const associated = await taskService.associatedExternalIds(
        task,
        site.reference("issue", "")
      );

      return {
        issues: page.issues.filter(({ id }) => associated.has(id)),
        nextPageToken: page.nextPageToken,
      };
    },
  });

  const issueCommentsList = tool({
    name: "jira_issue_comments_list",
    description:
      "List the comments of an issue, as Jira's GET /rest/api/2/issue/{issueIdOrKey}/comment.",
    inputSchema: z.object({
      issueIdOrKey,
      startAt: z.number().int().nonnegative().optional(),
      maxResults: z.number().int().min(1).max(100).optional(),
      orderBy: z.enum(["created", "-created"]).optional(),
    }),
    async execute({ issueIdOrKey: key, ...page }, context) {
      const issue = await requireIssue(context, key, "automation");

      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(page).map(([name, value]) => [name, String(value)])
        )
      );

      return await request(
        `/issue/${issue.id}/comment?${query.toString()}`,
        z.object({
          startAt: z.number(),
          total: z.number(),
          comments: z.array(jiraCommentSchema),
        })
      );
    },
  });

  const issueCommentAdd = tool({
    name: "jira_issue_comment_add",
    description:
      "Comment on an issue, in Jira wiki markup, as Jira's POST /rest/api/2/issue/{issueIdOrKey}/comment.",
    inputSchema: z.object({ issueIdOrKey, body: z.string().min(1) }),
    async execute({ issueIdOrKey: key, body }, context) {
      const issue = await requireIssue(context, key, "task");

      const comment = await request(
        `/issue/${issue.id}/comment`,
        jiraCommentSchema,
        {
          method: "POST",
          body: { body },
        }
      );

      await effectService.record(
        site.reference("comment", comment.id),
        {
          ...site.issuePresentation(issue),
          url: site.commentUrl(issue.key, comment.id),
        },
        context
      );

      return comment;
    },
  });

  const issueAssign = tool({
    name: "jira_issue_assign",
    description:
      "Assign an issue, to Yapir's Jira account by default, as Jira's PUT /rest/api/2/issue/{issueIdOrKey}/assignee.",
    inputSchema: z.object({
      issueIdOrKey,
      accountId: z.string().min(1).optional(),
    }),
    async execute({ issueIdOrKey: key, accountId }, context) {
      const issue = await requireIssue(context, key, "task");
      const yapir = await jiraService.myself();
      const assignee = accountId ?? yapir.accountId;
      await request(`/issue/${issue.id}/assignee`, z.null(), {
        method: "PUT",
        body: { accountId: assignee },
      });

      // The assignment returns nothing: its changelog entry identifies the effect.
      const changelog = await jiraService.list(
        `/issue/${issue.id}/changelog`,
        changelogPageSchema
      );

      const assignment = changelog.findLast(
        ({ author, items }) =>
          author.accountId === yapir.accountId &&
          items.some(
            (item) => item.field === "assignee" && item.to === assignee
          )
      );

      if (assignment) {
        await effectService.record(
          site.reference("changelog", assignment.id),
          site.issuePresentation(issue),
          context
        );
      }

      return { key: issue.key, accountId: assignee };
    },
  });

  return {
    issueGet,
    searchJql,
    issueCommentsList,
    issueCommentAdd,
    issueAssign,
  };
}
