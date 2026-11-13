import { emitterEventNames } from "@octokit/webhooks";
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

export const githubProvider = { id: "github", label: "GitHub" };
export const githubIssueResource = { id: "issue", label: "Issues" };

export const githubPullRequestResource = {
  id: "pull_request",
  label: "Pull requests",
};

export const githubBranchResource = { id: "branch", label: "Branches" };

export const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  type: z.string(),
});

export const githubRepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
});

export const githubLabelSchema = z.object({ id: z.number(), name: z.string() });

export const githubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.string(),
  state_reason: z.string().nullish(),
  html_url: z.string(),
  user: githubUserSchema,
  labels: z.array(githubLabelSchema),
  assignees: z.array(githubUserSchema),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  // Present when the issue is a pull request.
  pull_request: z.object({ merged_at: z.string().nullish() }).optional(),
});

export const githubRefSchema = z.object({ ref: z.string(), sha: z.string() });

export const githubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.string(),
  draft: z.boolean().optional(),
  merged: z.boolean().nullish(),
  html_url: z.string(),
  user: githubUserSchema,
  labels: z.array(githubLabelSchema),
  assignees: z.array(githubUserSchema).nullish(),
  head: githubRefSchema,
  base: githubRefSchema,
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  merged_at: z.string().nullable(),
});

export const githubCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  html_url: z.string(),
  // Null when its author's account was deleted.
  user: githubUserSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const githubReviewSchema = z.object({
  id: z.number(),
  body: z.string().nullable(),
  state: z.string(),
  html_url: z.string(),
  user: githubUserSchema.nullable(),
  commit_id: z.string(),
  submitted_at: z.string().nullish(),
});

export const githubReviewCommentSchema = githubCommentSchema.extend({
  path: z.string(),
  diff_hunk: z.string(),
  commit_id: z.string(),
  line: z.number().nullish(),
  side: z.string().nullish(),
  start_line: z.number().nullish(),
  in_reply_to_id: z.number().optional(),
  pull_request_review_id: z.number().nullable(),
});

// The fields an edit changed, with their previous values.
export const githubChangesSchema = z.record(z.string(), z.json()).optional();

export function githubActions(name: string) {
  return emitterEventNames.flatMap((event) =>
    event.startsWith(`${name}.`) ? [event.slice(name.length + 1)] : []
  );
}

export function githubReference(
  kind: string,
  id: string | number,
  host = "github.com"
): ResourceReference {
  return { integration: "github", host, kind, externalId: String(id) };
}

// Issues and pull requests share their numbers: a pull request is an issue of its repository.
export function githubIssueReference(
  repositoryId: string | number,
  number: number,
  host = "github.com"
) {
  return githubReference("issue", `${repositoryId}#${number}`, host);
}

export function githubResourcePresentation(resource: {
  number: number;
  title: string;
  html_url: string;
}) {
  return {
    label: `#${resource.number}`,
    title: resource.title,
    url: resource.html_url,
  };
}

export function githubEventResource(
  repository: z.infer<typeof githubRepositorySchema>,
  issue: { number: number; title: string; html_url: string }
): EventResource {
  return {
    reference: githubIssueReference(repository.id, issue.number),
    presentation: githubResourcePresentation(issue),
  };
}

// A delivery naming no issue or pull request concerns only itself.
export function githubDeliveryResource(
  id: string,
  presentation: ResourcePresentation
): EventResource {
  return { reference: githubReference("delivery", id), presentation };
}

export function githubEvent(effectService: EffectService) {
  return async (
    id: string,
    repository: z.infer<typeof githubRepositorySchema>,
    resources: EventResource[],
    // The resource a Yapir agent's action created, if the event reports one.
    authored?: ResourceReference
  ): Promise<Omit<PreparedEvent, "type" | "data">> => ({
    id: `github:github.com:${id}`,
    source: githubReference("repository", repository.id),
    resources,
    author: await effectService.author(authored),
  });
}

export function githubActor(
  user: z.infer<typeof githubUserSchema>,
  author: YapirAuthor | null
) {
  return eventActor(author, {
    name: user.login,
    avatarUrl: `https://github.com/${user.login}.png`,
    url: `https://github.com/${user.login}`,
  });
}
