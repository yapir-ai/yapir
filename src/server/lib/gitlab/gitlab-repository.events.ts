import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { TriggerEventDefinition } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { providerEvents } from "@server/lib/events/provider-events";
import { gitHostEventCandidates } from "@server/lib/git/git-host-event-candidates";
import { z } from "zod";

import {
  gitlabActor,
  gitlabEvent,
  gitlabProjectSchema,
  gitlabProvider,
  gitlabReference,
} from "./gitlab-event";

const commitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string(),
  url: z.string(),
  author: z.object({ name: z.string(), email: z.string() }),
  added: z.array(z.string()).optional(),
  modified: z.array(z.string()).optional(),
  removed: z.array(z.string()).optional(),
});

// Push and tag push deliveries describe their user in flat fields.
const pushSchema = z.object({
  object_kind: z.enum(["push", "tag_push"]),
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  checkout_sha: z.string().nullable(),
  message: z.string().nullable(),
  user_id: z.number(),
  user_name: z.string(),
  user_username: z.string(),
  user_avatar: z.string().nullish(),
  project: gitlabProjectSchema,
  commits: z.array(commitSchema),
  total_commits_count: z.number(),
});

const releaseSchema = z.object({
  object_kind: z.literal("release"),
  action: z.string(),
  id: z.number(),
  tag: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  created_at: z.string(),
  released_at: z.string(),
  project: gitlabProjectSchema,
  commit: commitSchema.pick({ id: true, message: true, url: true }),
});

function pushPresentation({ ref, after, project }: z.infer<typeof pushSchema>) {
  return {
    label: ref,
    title: after.slice(0, 7),
    url: `${project.web_url}/-/commit/${after}`,
  };
}

function releasePresentation(release: z.infer<typeof releaseSchema>) {
  return { label: release.tag, title: release.name, url: release.url };
}

// Pushes and releases name no issue or merge request: each delivery starts its own task.
export function gitlabRepositoryEvents({
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
    capabilities: [],
    findCandidates: gitHostEventCandidates(db, "gitlab"),
    filter: eventFilterService,
  };

  const event = gitlabEvent(host, effectService);

  const pushEvents = (type: "push" | "tag_push", label: string) =>
    providerEvents({
      ...metadata,
      type: `gitlab.${type}`,
      resource: { id: type, label },
      actions: [],
      schema: pushSchema,
      // A Yapir agent pushes branches, not tags, through the Git proxy.
      prepare: async (id, data) =>
        await event.prepare(
          id,
          data.project,
          [event.delivery(id, pushPresentation(data))],
          type === "push"
            ? gitlabReference(host, "commit", data.after)
            : undefined
        ),
      present: (data, author) => ({
        actor: gitlabActor(
          data.project,
          {
            name: data.user_name,
            username: data.user_username,
            avatar_url: data.user_avatar,
          },
          author
        ),
        resource: pushPresentation(data),
        excerpt: data.message ?? undefined,
      }),
    });

  return [
    ...pushEvents("push", "Pushes"),
    ...pushEvents("tag_push", "Tag pushes"),
    ...providerEvents({
      ...metadata,
      type: "gitlab.release",
      resource: { id: "release", label: "Releases" },
      actions: ["create", "update", "delete"],
      schema: releaseSchema,
      prepare: async (id, data) =>
        await event.prepare(id, data.project, [
          event.delivery(id, releasePresentation(data)),
        ]),
      present: (data) => ({
        resource: releasePresentation(data),
        excerpt: data.description ?? undefined,
        url: data.url,
      }),
    }),
  ];
}
