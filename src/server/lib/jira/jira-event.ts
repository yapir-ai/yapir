import type {
  ResourceReference,
  YapirAuthor,
} from "@server/lib/events/event-definition";
import { eventActor } from "@server/lib/events/provider-events";
import { z } from "zod";

export const jiraProvider = { id: "jira", label: "Jira" };
export const jiraIssueResource = { id: "issue", label: "Issues" };

export const jiraUserSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  avatarUrls: z.object({ "48x48": z.string() }).optional(),
});

export const jiraIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    project: z.object({ id: z.string(), key: z.string(), name: z.string() }),
    issuetype: z.object({ name: z.string() }),
    status: z.object({ name: z.string() }),
  }),
});

export const jiraIssueDetailsSchema = jiraIssueSchema.extend({
  fields: jiraIssueSchema.shape.fields.extend({
    description: z.string().nullish(),
    labels: z.array(z.string()),
    assignee: jiraUserSchema.nullable(),
    reporter: jiraUserSchema.nullish(),
    priority: z.object({ name: z.string() }).nullish(),
  }),
});

export const jiraCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: jiraUserSchema,
  created: z.string(),
  updated: z.string(),
});

// A field change of an issue update: from and to hold IDs, their strings hold names.
export const jiraChangelogItemSchema = z.object({
  field: z.string(),
  from: z.string().nullable(),
  fromString: z.string().nullable(),
  to: z.string().nullable(),
  toString: z.string().nullable(),
});

// The resources of the Jira site at the Connection's URL.
export function jiraSite(url: string) {
  const { host } = new URL(url);

  return {
    host,
    reference: (kind: string, id: string): ResourceReference => ({
      integration: "jira",
      host,
      kind,
      externalId: id,
    }),
    issuePresentation: (issue: {
      key: string;
      fields: { summary: string };
    }) => ({
      label: issue.key,
      title: issue.fields.summary,
      url: `${url}/browse/${issue.key}`,
    }),
    commentUrl: (issueKey: string, commentId: string) =>
      `${url}/browse/${issueKey}?focusedCommentId=${commentId}`,
  };
}

export type JiraSite = ReturnType<typeof jiraSite>;

export function jiraActor(
  user: z.infer<typeof jiraUserSchema>,
  author: YapirAuthor | null
) {
  return eventActor(author, {
    name: user.displayName,
    avatarUrl: user.avatarUrls?.["48x48"],
  });
}
