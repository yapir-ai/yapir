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
  githubDeliveryResource,
  githubEvent,
  githubProvider,
  githubReference,
  githubRepositorySchema,
  githubUserSchema,
} from "./github-event";

const commitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().nullable(),
    username: z.string().optional(),
  }),
  added: z.array(z.string()),
  removed: z.array(z.string()),
  modified: z.array(z.string()),
});

const pushSchema = z.object({
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  base_ref: z.string().nullable(),
  created: z.boolean(),
  deleted: z.boolean(),
  forced: z.boolean(),
  compare: z.string(),
  commits: z.array(commitSchema),
  head_commit: commitSchema.nullable(),
  pusher: z.object({ name: z.string(), email: z.string().nullish() }),
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

const releaseSchema = z.object({
  action: z.string(),
  release: z.object({
    id: z.number(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().nullable(),
    body: z.string().nullable(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    html_url: z.string(),
    author: githubUserSchema,
    created_at: z.string().nullable(),
    published_at: z.string().nullable(),
  }),
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

function pushPresentation({ ref, after, compare }: z.infer<typeof pushSchema>) {
  return { label: ref, title: after.slice(0, 7), url: compare };
}

function releasePresentation({ release }: z.infer<typeof releaseSchema>) {
  return {
    label: release.tag_name,
    title: release.name ?? undefined,
    url: release.html_url,
  };
}

// Pushes and releases name no issue or pull request: each delivery starts its own task.
export function githubRepositoryEvents({
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
    capabilities: [],
    findCandidates: gitHostEventCandidates(db, "github"),
    filter: eventFilterService,
  };

  const event = githubEvent(effectService);

  return [
    ...providerEvents({
      ...metadata,
      type: "github.push",
      resource: { id: "push", label: "Pushes" },
      actions: [],
      schema: pushSchema,
      // A Yapir agent pushes through the Git proxy.
      prepare: async (id, data) =>
        await event(
          id,
          data.repository,
          [githubDeliveryResource(id, pushPresentation(data))],
          githubReference("commit", data.after)
        ),
      present: (data, author) => ({
        actor: githubActor(data.sender, author),
        resource: pushPresentation(data),
        excerpt: data.head_commit?.message,
        url: data.compare,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "github.release",
      resource: { id: "release", label: "Releases" },
      actions: githubActions("release"),
      schema: releaseSchema,
      prepare: async (id, data) =>
        await event(id, data.repository, [
          githubDeliveryResource(id, releasePresentation(data)),
        ]),
      present: (data, author) => ({
        actor: githubActor(data.sender, author),
        resource: releasePresentation(data),
        excerpt: data.release.body ?? undefined,
        url: data.release.html_url,
      }),
    }),
  ];
}
