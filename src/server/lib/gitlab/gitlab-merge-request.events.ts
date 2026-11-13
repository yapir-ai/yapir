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
  gitlabIidReference,
  gitlabMergeRequestResource,
  gitlabMergeRequestSchema,
  gitlabProjectSchema,
  gitlabProvider,
  gitlabReference,
  gitlabResourcePresentation,
  gitlabUserSchema,
} from "./gitlab-event";

const mergeRequestSchema = z.object({
  object_kind: z.literal("merge_request"),
  user: gitlabUserSchema,
  project: gitlabProjectSchema,
  object_attributes: gitlabMergeRequestSchema.extend({
    action: z.string(),
    // The previous head, when the update pushed commits.
    oldrev: z.string().optional(),
  }),
  changes: gitlabChangesSchema,
  reviewers: z.array(gitlabUserSchema).optional(),
});

const pipelineSchema = z.object({
  object_kind: z.literal("pipeline"),
  user: gitlabUserSchema,
  project: gitlabProjectSchema,
  object_attributes: z.object({
    id: z.number(),
    iid: z.number().optional(),
    ref: z.string(),
    tag: z.boolean(),
    sha: z.string(),
    before_sha: z.string(),
    source: z.string(),
    status: z.string(),
    detailed_status: z.string(),
    url: z.string(),
    created_at: z.string(),
    finished_at: z.string().nullable(),
  }),
  merge_request: z
    .object({
      id: z.number(),
      iid: z.number(),
      title: z.string(),
      source_branch: z.string(),
      target_branch: z.string(),
      state: z.string(),
      url: z.string(),
    })
    .nullable(),
  builds: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      stage: z.string(),
      status: z.string(),
      failure_reason: z.string().nullish(),
    })
  ),
});

// A Yapir agent opens a merge request with its tool, and pushes through the Git proxy.
function authoredResource(
  host: string,
  project: { id: number },
  mergeRequest: z.infer<typeof mergeRequestSchema>["object_attributes"]
) {
  if (mergeRequest.action === "open") {
    return gitlabIidReference(
      host,
      "merge_request",
      project.id,
      mergeRequest.iid
    );
  }

  if (mergeRequest.oldrev && mergeRequest.last_commit) {
    return gitlabReference(host, "commit", mergeRequest.last_commit.id);
  }
}

export function gitlabMergeRequestEvents({
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
    capabilities: ["gitlab.merge_requests.read"],
    findCandidates: gitHostEventCandidates(db, "gitlab"),
    filter: eventFilterService,
  };

  const event = gitlabEvent(host, effectService);

  return [
    ...providerEvents({
      ...metadata,
      type: "gitlab.merge_request",
      resource: gitlabMergeRequestResource,
      actions: [
        "open",
        "close",
        "reopen",
        "update",
        "approved",
        "unapproved",
        "approval",
        "unapproval",
        "merge",
      ],
      schema: mergeRequestSchema,
      prepare: async (id, { project, object_attributes: mergeRequest }) =>
        await event.prepare(
          id,
          project,
          [event.resource("merge_request", project, mergeRequest)],
          authoredResource(host, project, mergeRequest)
        ),
      present: (
        { project, user, object_attributes: mergeRequest },
        author
      ) => ({
        actor: gitlabActor(project, user, author),
        resource: gitlabResourcePresentation(
          "merge_request",
          mergeRequest,
          mergeRequest.url
        ),
        url: mergeRequest.url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "gitlab.pipeline",
      resource: { id: "pipeline", label: "Pipelines" },
      actions: [],
      schema: pipelineSchema,
      // A branch pipeline names no merge request.
      prepare: async (
        id,
        { project, object_attributes: pipeline, merge_request }
      ) =>
        await event.prepare(id, project, [
          merge_request
            ? event.resource("merge_request", project, merge_request)
            : event.delivery(id, {
                label: pipeline.ref,
                title: pipeline.status,
                url: pipeline.url,
              }),
        ]),
      present: ({ project, user, object_attributes: pipeline }, author) => ({
        actor: gitlabActor(project, user, author),
        resource: { label: pipeline.ref, url: pipeline.url },
        detail: pipeline.status,
        url: pipeline.url,
      }),
    }),
  ];
}
