import type { EffectService } from "@server/lib/effects/effect.service";
import type {
  EventResource,
  PreparedEvent,
  ResourcePresentation,
  ResourceReference,
  YapirAuthor,
} from "@server/lib/events/event-definition";
import { eventActor } from "@server/lib/events/provider-events";
import { z } from "zod";

export const gitlabProvider = { id: "gitlab", label: "GitLab" };
export const gitlabIssueResource = { id: "issue", label: "Issues" };

export const gitlabMergeRequestResource = {
  id: "merge_request",
  label: "Merge requests",
};

export const gitlabBranchResource = { id: "branch", label: "Branches" };

export const gitlabUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().nullish(),
});

export const gitlabProjectSchema = z.object({
  id: z.number(),
  path_with_namespace: z.string(),
  web_url: z.string(),
});

const labelSchema = z.object({
  id: z.number(),
  title: z.string(),
});

const discussionSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  url: z.string(),
  author_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const gitlabIssueSchema = discussionSchema.extend({
  assignee_ids: z.array(z.number()).optional(),
  closed_at: z.string().nullish(),
  confidential: z.boolean(),
  labels: z.array(labelSchema).optional(),
});

export const gitlabMergeRequestSchema = discussionSchema.extend({
  draft: z.boolean().optional(),
  source_branch: z.string(),
  target_branch: z.string(),
  merge_status: z.string().optional(),
  detailed_merge_status: z.string().optional(),
  last_commit: z.object({ id: z.string(), message: z.string() }).optional(),
  assignee_ids: z.array(z.number()).optional(),
  reviewer_ids: z.array(z.number()).optional(),
  labels: z.array(labelSchema).optional(),
});

// The fields an update changed, with their previous and current values.
export const gitlabChangesSchema = z.record(z.string(), z.json()).optional();

export function gitlabReference(
  host: string,
  kind: string,
  id: string | number
): ResourceReference {
  return { integration: "gitlab", host, kind, externalId: String(id) };
}

// Issues and merge requests have their own IIDs in their project.
export function gitlabIidReference(
  host: string,
  kind: "issue" | "merge_request",
  projectId: string | number,
  iid: number
) {
  return gitlabReference(host, kind, `${projectId}#${iid}`);
}

// Issues read as #iid and merge requests as !iid.
const references = { issue: "#", merge_request: "!" };

export function gitlabResourcePresentation(
  kind: keyof typeof references,
  resource: { iid: number; title: string },
  url: string
) {
  return {
    label: `${references[kind]}${resource.iid}`,
    title: resource.title,
    url,
  };
}

export function gitlabEvent(host: string, effectService: EffectService) {
  return {
    resource: (
      kind: keyof typeof references,
      project: { id: number },
      resource: { iid: number; title: string; url: string }
    ): EventResource => ({
      reference: gitlabIidReference(host, kind, project.id, resource.iid),
      presentation: gitlabResourcePresentation(kind, resource, resource.url),
    }),
    // A delivery naming no issue or merge request concerns only itself.
    delivery: (
      id: string,
      presentation: ResourcePresentation
    ): EventResource => ({
      reference: gitlabReference(host, "delivery", id),
      presentation,
    }),
    prepare: async (
      id: string,
      project: { id: number },
      resources: EventResource[],
      // The resource a Yapir agent's action created, if the event reports one.
      authored?: ResourceReference
    ): Promise<Omit<PreparedEvent, "type" | "data">> => ({
      id: `gitlab:${host}:${id}`,
      source: gitlabReference(host, "repository", project.id),
      resources,
      author: await effectService.author(authored),
    }),
  };
}

export function gitlabActor(
  project: z.infer<typeof gitlabProjectSchema>,
  user: { name: string; username: string; avatar_url?: string | null },
  author: YapirAuthor | null
) {
  return eventActor(author, {
    name: user.name,
    avatarUrl: user.avatar_url ?? undefined,
    url: new URL(`/${user.username}`, project.web_url).href,
  });
}
