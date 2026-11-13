import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { TriggerEventDefinition } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { providerEvents } from "@server/lib/events/provider-events";
import { gitHostEventCandidates } from "@server/lib/git/git-host-event-candidates";
import { z } from "zod";

import {
  gitlabActor,
  gitlabChangesSchema,
  gitlabEvent,
  gitlabIssueResource,
  gitlabIssueSchema,
  gitlabMergeRequestSchema,
  gitlabProjectSchema,
  gitlabProvider,
  gitlabReference,
  gitlabResourcePresentation,
  gitlabUserSchema,
} from "./gitlab-event";

const issueSchema = z.object({
  object_kind: z.literal("issue"),
  user: gitlabUserSchema,
  project: gitlabProjectSchema,
  object_attributes: gitlabIssueSchema.extend({ action: z.string() }),
  changes: gitlabChangesSchema,
});

const noteSchema = z.object({
  object_kind: z.literal("note"),
  user: gitlabUserSchema,
  project: gitlabProjectSchema,
  object_attributes: z.object({
    id: z.number(),
    note: z.string(),
    noteable_type: z.string(),
    action: z.string(),
    system: z.boolean(),
    type: z.string().nullable(),
    discussion_id: z.string(),
    position: z.json().nullish(),
    url: z.string(),
    author_id: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  issue: gitlabIssueSchema.optional(),
  merge_request: gitlabMergeRequestSchema.optional(),
});

export function gitlabIssueEvents({
  db,
  host,
  effectService,
  eventFilterService,
}: {
  db: Db;
  host: string;
  effectService: EffectService;
  eventFilterService: EventFilterService;
}): TriggerEventDefinition[] {
  const metadata = {
    provider: gitlabProvider,
    findCandidates: gitHostEventCandidates(db, "gitlab"),
    filter: eventFilterService,
  };

  const event = gitlabEvent(host, effectService);

  // A note on a commit or a snippet concerns only itself.
  function noteable(
    id: string,
    noteableType: string,
    project: { id: number },
    issue?: z.infer<typeof gitlabIssueSchema>,
    mergeRequest?: z.infer<typeof gitlabMergeRequestSchema>
  ) {
    if (issue) {
      return event.resource("issue", project, issue);
    }

    if (mergeRequest) {
      return event.resource("merge_request", project, mergeRequest);
    }

    return event.delivery(id, { label: noteableType });
  }

  return [
    ...providerEvents({
      ...metadata,
      type: "gitlab.issue",
      resource: gitlabIssueResource,
      actions: ["open", "close", "reopen", "update"],
      schema: issueSchema,
      capabilities: ["gitlab.issues.read"],
      prepare: async (id, { project, object_attributes: issue }) =>
        await event.prepare(id, project, [
          event.resource("issue", project, issue),
        ]),
      present: ({ project, user, object_attributes: issue }, author) => ({
        actor: gitlabActor(project, user, author),
        resource: gitlabResourcePresentation("issue", issue, issue.url),
        url: issue.url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "gitlab.note",
      resource: { id: "note", label: "Comments" },
      actions: ["create", "update"],
      schema: noteSchema,
      capabilities: ["gitlab.issues.read", "gitlab.merge_requests.read"],
      prepare: async (
        id,
        { project, object_attributes: note, issue, merge_request }
      ) =>
        await event.prepare(
          id,
          project,
          [noteable(id, note.noteable_type, project, issue, merge_request)],
          note.action === "create"
            ? gitlabReference(host, "note", note.id)
            : undefined
        ),
      present: (
        { project, user, object_attributes: note, issue, merge_request },
        author
      ) => ({
        actor: gitlabActor(project, user, author),
        resource: issue
          ? gitlabResourcePresentation("issue", issue, issue.url)
          : merge_request &&
            gitlabResourcePresentation(
              "merge_request",
              merge_request,
              merge_request.url
            ),
        excerpt: note.note,
        url: note.url,
      }),
    }),
  ];
}
