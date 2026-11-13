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
  githubEventResource,
  githubLabelSchema,
  githubIssueReference,
  githubProvider,
  githubPullRequestResource,
  githubPullRequestSchema,
  githubRefSchema,
  githubReference,
  githubRepositorySchema,
  githubResourcePresentation,
  githubReviewCommentSchema,
  githubReviewSchema,
  githubUserSchema,
} from "./github-event";

const pullRequestSchema = z.object({
  action: z.string(),
  number: z.number(),
  pull_request: githubPullRequestSchema,
  before: z.string().optional(),
  after: z.string().optional(),
  label: githubLabelSchema.optional(),
  requested_reviewer: githubUserSchema.optional(),
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

const reviewSchema = z.object({
  action: z.string(),
  review: githubReviewSchema,
  pull_request: githubPullRequestSchema,
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

const reviewCommentSchema = z.object({
  action: z.string(),
  comment: githubReviewCommentSchema,
  pull_request: githubPullRequestSchema,
  changes: githubChangesSchema,
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

const checkSuiteSchema = z.object({
  action: z.string(),
  check_suite: z.object({
    id: z.number(),
    head_branch: z.string().nullable(),
    head_sha: z.string(),
    status: z.string().nullable(),
    conclusion: z.string().nullable(),
    app: z.object({ slug: z.string().optional(), name: z.string() }),
    pull_requests: z.array(
      z.object({
        number: z.number(),
        head: githubRefSchema,
        base: githubRefSchema.extend({ repo: z.object({ id: z.number() }) }),
      })
    ),
  }),
  repository: githubRepositorySchema,
  sender: githubUserSchema,
});

export function githubPullRequestEvents({
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
    capabilities: ["github.pull_requests.read"],
    findCandidates: gitHostEventCandidates(db, "github"),
    filter: eventFilterService,
  };

  const event = githubEvent(effectService);

  return [
    ...providerEvents({
      ...metadata,
      type: "github.pull_request",
      resource: githubPullRequestResource,
      actions: githubActions("pull_request"),
      schema: pullRequestSchema,
      // A Yapir agent opens a pull request with its tool, and pushes through the Git proxy.
      prepare: async (id, { action, repository, pull_request, after }) =>
        await event(
          id,
          repository,
          [githubEventResource(repository, pull_request)],
          {
            opened: githubIssueReference(repository.id, pull_request.number),
            synchronize: after ? githubReference("commit", after) : undefined,
          }[action]
        ),
      present: ({ pull_request, sender }, author) => ({
        actor: githubActor(sender, author),
        resource: githubResourcePresentation(pull_request),
        url: pull_request.html_url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "github.pull_request_review",
      resource: { id: "pull_request_review", label: "Pull request reviews" },
      actions: githubActions("pull_request_review"),
      schema: reviewSchema,
      prepare: async (id, { action, repository, pull_request, review }) =>
        await event(
          id,
          repository,
          [githubEventResource(repository, pull_request)],
          action === "submitted"
            ? githubReference("review", review.id)
            : undefined
        ),
      present: ({ pull_request, review, sender }, author) => ({
        actor: githubActor(review.user ?? sender, author),
        resource: githubResourcePresentation(pull_request),
        detail: review.state,
        excerpt: review.body ?? undefined,
        url: review.html_url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "github.pull_request_review_comment",
      resource: {
        id: "pull_request_review_comment",
        label: "Pull request review comments",
      },
      actions: githubActions("pull_request_review_comment"),
      schema: reviewCommentSchema,
      prepare: async (id, { action, repository, pull_request, comment }) =>
        await event(
          id,
          repository,
          [githubEventResource(repository, pull_request)],
          action === "created"
            ? githubReference("review_comment", comment.id)
            : undefined
        ),
      present: ({ pull_request, comment, sender }, author) => ({
        actor: githubActor(comment.user ?? sender, author),
        resource: githubResourcePresentation(pull_request),
        excerpt: comment.body,
        url: comment.html_url,
      }),
    }),
    ...providerEvents({
      ...metadata,
      type: "github.check_suite",
      resource: { id: "check_suite", label: "Check suites" },
      actions: githubActions("check_suite"),
      schema: checkSuiteSchema,
      // A check suite names the pull requests of its head, forks' included.
      async prepare(id, { repository, check_suite }) {
        const pulls = check_suite.pull_requests.filter(
          ({ base }) => base.repo.id === repository.id
        );

        return await event(
          id,
          repository,
          pulls.length > 0
            ? pulls.map(({ number }) => ({
                reference: githubIssueReference(repository.id, number),
                presentation: { label: `#${number}` },
              }))
            : [
                githubDeliveryResource(id, {
                  label: check_suite.app.name,
                  title: check_suite.head_branch ?? check_suite.head_sha,
                }),
              ]
        );
      },
      present: ({ check_suite, sender }, author) => ({
        actor: githubActor(sender, author),
        resource: {
          label: check_suite.app.name,
          title: check_suite.head_branch ?? check_suite.head_sha,
        },
        detail: check_suite.conclusion ?? check_suite.status ?? undefined,
      }),
    }),
  ];
}
