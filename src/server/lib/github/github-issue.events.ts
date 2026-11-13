import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { TriggerEventDefinition } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { providerEvents } from "@server/lib/events/provider-events";
import { gitHostEventCandidates } from "@server/lib/git/git-host-event-candidates";
import { z } from "zod";

import {
  githubActions,
  githubActor,
  githubChangesSchema,
  githubCommentSchema,
  githubEvent,
  githubEventResource,
  githubIssueResource,
  githubIssueSchema,
  githubLabelSchema,
  githubProvider,
  githubReference,
  githubRepositorySchema,
  githubResourcePresentation,
  githubUserSchema,
} from "./github-event";

const issuesSchema = z.object({
  action: z.string(),
  issue: githubIssueSchema,
  label: githubLabelSchema.optional(),
  assignee: githubUserSchema.nullish(),
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

const issueCommentSchema = z.object({
  action: z.string(),
  issue: githubIssueSchema,
  comment: githubCommentSchema,
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

export function githubIssueEvents({
  db,
  effectService,
  eventFilterService,
}: {
  db: Db;
  effectService: EffectService;
  eventFilterService: EventFilterService;
}): TriggerEventDefinition[] {
  const metadata = {
    provider: githubProvider,
    findCandidates: gitHostEventCandidates(db, "github"),
    filter: eventFilterService,
  };

  const event = githubEvent(effectService);

  return [
    ...providerEvents({
      ...metadata,
      type: "github.issues",
      resource: githubIssueResource,
      actions: githubActions("issues"),
      schema: issuesSchema,
      capabilities: ["github.issues.read"],
      prepare: async (id, { repository, issue }) =>
        await event(id, repository, [githubEventResource(repository, issue)]),
      present: ({ issue, sender }, author) => ({
        actor: githubActor(sender, author),
        resource: githubResourcePresentation(issue),
        url: issue.html_url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "github.issue_comment",
      resource: { id: "issue_comment", label: "Issue comments" },
      actions: githubActions("issue_comment"),
      schema: issueCommentSchema,
      // The issue of a comment can be a pull request.
      capabilities: ["github.issues.read", "github.pull_requests.read"],
      prepare: async (id, { action, repository, issue, comment }) =>
        await event(
          id,
          repository,
          [githubEventResource(repository, issue)],
          action === "created"
            ? githubReference("issue_comment", comment.id)
            : undefined
        ),
      present: ({ issue, comment, sender }, author) => ({
        actor: githubActor(comment.user ?? sender, author),
        resource: githubResourcePresentation(issue),
        excerpt: comment.body,
        url: comment.html_url,
      }),
    }),
  ];
}
