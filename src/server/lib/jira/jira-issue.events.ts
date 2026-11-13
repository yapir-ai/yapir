import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type {
  ResourceReference,
  TriggerEventDefinition,
} from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { providerEvents } from "@server/lib/events/provider-events";
import { triggeredAutomations } from "@server/lib/events/triggered-automations";
import { z } from "zod";

import {
  jiraActor,
  jiraChangelogItemSchema,
  jiraCommentSchema,
  jiraIssueDetailsSchema,
  jiraIssueResource,
  jiraIssueSchema,
  jiraProvider,
  jiraUserSchema,
} from "./jira-event";
import type { JiraSite } from "./jira-event";

const issueEventSchema = z.object({
  webhookEvent: z.string(),
  issue: jiraIssueDetailsSchema,
  user: jiraUserSchema,
  changelog: z
    .object({ id: z.string(), items: z.array(jiraChangelogItemSchema) })
    .optional(),
  // An update can be a comment's, without a changelog.
  comment: z.object({ id: z.string() }).optional(),
});

const commentEventSchema = z.object({
  webhookEvent: z.string(),
  issue: jiraIssueSchema,
  comment: jiraCommentSchema,
});

export function jiraIssueEvents({
  db,
  site,
  effectService,
  eventFilterService,
}: {
  db: Db;
  site: JiraSite;
  effectService: EffectService;
  eventFilterService: EventFilterService;
}): TriggerEventDefinition[] {
  const metadata = {
    provider: jiraProvider,
    capabilities: ["jira.issues.read"],
    actions: [],
    findCandidates: triggeredAutomations(db),
    filter: eventFilterService,
  };

  async function prepare(
    id: string,
    issue: z.infer<typeof jiraIssueSchema>,
    // The change or comment a Yapir agent's action created, if the event reports one.
    authored?: ResourceReference
  ) {
    return {
      id: `jira:${site.host}:${id}`,
      source: site.reference("project", issue.fields.project.id),
      resources: [
        {
          reference: site.reference("issue", issue.id),
          presentation: site.issuePresentation(issue),
        },
      ],
      author: await effectService.author(authored),
    };
  }

  function authoredChange(
    changelog?: { id: string },
    comment?: { id: string }
  ) {
    if (changelog) {
      return site.reference("changelog", changelog.id);
    }

    if (comment) {
      return site.reference("comment", comment.id);
    }
  }

  const issueEvents = (webhookEvent: string) =>
    providerEvents({
      ...metadata,
      type: `jira.${webhookEvent}`,
      resource: jiraIssueResource,
      schema: issueEventSchema,
      prepare: async (id, { issue, changelog, comment }) =>
        await prepare(id, issue, authoredChange(changelog, comment)),
      present: ({ issue, user }, author) => ({
        actor: jiraActor(user, author),
        resource: site.issuePresentation(issue),
      }),
    });

  return [
    ...issueEvents("issue_created"),
    ...issueEvents("issue_updated"),
    ...providerEvents({
      ...metadata,
      type: "jira.comment_created",
      resource: { id: "comment", label: "Comments" },
      schema: commentEventSchema,
      prepare: async (id, { issue, comment }) =>
        await prepare(id, issue, site.reference("comment", comment.id)),
      present: ({ issue, comment }, author) => ({
        actor: jiraActor(comment.author, author),
        resource: site.issuePresentation(issue),
        excerpt: comment.body,
        url: site.commentUrl(issue.key, comment.id),
      }),
    }),
  ];
}
