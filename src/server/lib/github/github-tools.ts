import type { RepositorySelect } from "@server/lib/db/schema";
import type { EffectService } from "@server/lib/effects/effect.service";
import { forbidden } from "@server/lib/errors/error.factory";
import type { ResourcePresentation } from "@server/lib/events/event-definition";
import { requireRepository } from "@server/lib/tasks/task.service";
import type {
  AssociationScope,
  TaskService,
} from "@server/lib/tasks/task.service";
import { repositoryInput, tool } from "@server/lib/tools/capability-definition";
import type {
  ToolCallContext,
  ToolContext,
} from "@server/lib/tools/capability-definition";
import { z } from "zod";

import {
  githubCommentSchema,
  githubIssueReference,
  githubIssueSchema,
  githubPullRequestSchema,
  githubReference,
  githubResourcePresentation,
  githubReviewCommentSchema,
  githubReviewSchema,
} from "./github-event";
import { githubRepository } from "./github.service";
import type { GithubService } from "./github.service";

const issueNumber = z.number().int().positive();
const pullNumber = z.number().int().positive();

const page = {
  per_page: z.number().int().min(1).max(100).optional(),
  page: z.number().int().positive().optional(),
};

const direction = z.enum(["asc", "desc"]).optional();

const reviewThreadSchema = z.object({
  id: z.string(),
  isResolved: z.boolean(),
  isOutdated: z.boolean(),
  path: z.string(),
  line: z.number().nullable(),
  comments: z.object({
    nodes: z.array(
      z.object({
        databaseId: z.number(),
        body: z.string(),
        author: z.object({ login: z.string() }).nullable(),
        createdAt: z.string(),
      })
    ),
  }),
});

export function githubTools({
  githubService,
  taskService,
  effectService,
}: {
  githubService: GithubService;
  taskService: TaskService;
  effectService: EffectService;
}) {
  async function client(repository: RepositorySelect) {
    return {
      octokit: await githubService.client(),
      target: githubRepository(repository.path),
    };
  }

  async function requireIssue(
    context: ToolCallContext,
    repository: RepositorySelect,
    number: number,
    scope: AssociationScope
  ) {
    return await taskService.requireScoped(
      context,
      githubIssueReference(repository.externalId, number, repository.host),
      scope,
      async () => {
        // An unscoped call can reach a resource without association.
        const { octokit, target } = await client(repository);

        const { data } = await octokit.issues.get({
          ...target,
          issue_number: number,
        });

        return githubResourcePresentation(data);
      }
    );
  }

  async function associated<T extends { number: number }>(
    { task, unscoped, repositories }: ToolCallContext,
    items: { item: T; repository: RepositorySelect }[]
  ) {
    if (unscoped) {
      return items.map(({ item }) => item);
    }

    const ids = await taskService.associatedExternalIds(
      task,
      githubReference("issue", "", repositories[0]!.host)
    );

    return items.flatMap(({ item, repository }) =>
      ids.has(
        githubIssueReference(repository.externalId, item.number).externalId
      )
        ? [item]
        : []
    );
  }

  const ofRepository = <T>(items: T[], repository: RepositorySelect) =>
    items.map((item) => ({ item, repository }));

  async function recordComment(
    context: ToolContext,
    repository: RepositorySelect,
    kind: "issue_comment" | "review_comment",
    presentation: ResourcePresentation,
    comment: { id: number; html_url: string }
  ) {
    await effectService.record(
      githubReference(kind, comment.id, repository.host),
      { ...presentation, url: comment.html_url },
      context
    );
  }

  const issuesGet = tool({
    name: "github_issues_get",
    description:
      "Get an issue or a pull request of a repository, as GitHub's issues.get REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_number: issueNumber,
    }),
    async execute({ repository: repositoryPath, issue_number }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, issue_number, "automation");
      const { octokit, target } = await client(repository);
      const { data } = await octokit.issues.get({ ...target, issue_number });

      return githubIssueSchema.parse(data);
    },
  });

  const issuesListForRepo = tool({
    name: "github_issues_list_for_repo",
    description:
      "List the issues and pull requests of a repository, as GitHub's issues.listForRepo REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      state: z.enum(["open", "closed", "all"]).optional(),
      labels: z.string().optional().describe("Comma-separated label names"),
      assignee: z.string().optional(),
      creator: z.string().optional(),
      mentioned: z.string().optional(),
      since: z.iso.datetime().optional(),
      sort: z.enum(["created", "updated", "comments"]).optional(),
      direction,
      ...page,
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      const { octokit, target } = await client(repository);

      const { data } = await octokit.issues.listForRepo({
        ...target,
        ...input,
      });

      return z
        .array(githubIssueSchema)
        .parse(await associated(context, ofRepository(data, repository)));
    },
  });

  const issuesListComments = tool({
    name: "github_issues_list_comments",
    description:
      "List the comments of an issue or the general comments of a pull request, as GitHub's issues.listComments REST operation. Yapir agents' comments start with their name in bold.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_number: issueNumber,
      since: z.iso.datetime().optional(),
      ...page,
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, input.issue_number, "automation");
      const { octokit, target } = await client(repository);

      const { data } = await octokit.issues.listComments({
        ...target,
        ...input,
      });

      return z.array(githubCommentSchema).parse(data);
    },
  });

  const searchIssuesAndPullRequests = tool({
    name: "github_search_issues_and_pull_requests",
    description:
      "Search the issues and pull requests of the project's repositories, as GitHub's search.issuesAndPullRequests REST operation, such as with `is:pr is:merged merged:>2026-09-01`. Yapir adds the project's repositories to q.",
    inputSchema: z.object({
      q: z.string().describe("GitHub search keywords and qualifiers"),
      sort: z
        .enum(["comments", "reactions", "interactions", "created", "updated"])
        .optional(),
      order: direction,
      ...page,
    }),
    async execute({ q, ...input }, context) {
      const octokit = await githubService.client();

      const { data } = await octokit.search.issuesAndPullRequests({
        q: `${context.repositories.map(({ path }) => `repo:${path}`).join(" ")} ${q}`,
        ...input,
      });

      // A repo qualifier in q can reach other repositories.
      const inProject = data.items.flatMap((item) => {
        const repository = context.repositories.find(({ path }) =>
          item.repository_url
            .toLowerCase()
            .endsWith(`/repos/${path}`.toLowerCase())
        );

        return repository ? [{ item, repository }] : [];
      });

      return z
        .array(githubIssueSchema)
        .parse(await associated(context, inProject));
    },
  });

  const pullsGet = tool({
    name: "github_pulls_get",
    description:
      "Get a pull request of a repository, or its diff with format diff, as GitHub's pulls.get REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
      format: z.enum(["json", "diff"]).default("json"),
    }),
    async execute(
      { repository: repositoryPath, pull_number, format },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, pull_number, "automation");
      const { octokit, target } = await client(repository);

      if (format === "diff") {
        const { data } = await octokit.pulls.get({
          ...target,
          pull_number,
          mediaType: { format: "diff" },
        });

        return data;
      }

      const { data } = await octokit.pulls.get({ ...target, pull_number });

      return githubPullRequestSchema.parse(data);
    },
  });

  const pullsList = tool({
    name: "github_pulls_list",
    description:
      "List the pull requests of a repository, as GitHub's pulls.list REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      state: z.enum(["open", "closed", "all"]).optional(),
      head: z.string().optional().describe("user:ref-name"),
      base: z.string().optional(),
      sort: z
        .enum(["created", "updated", "popularity", "long-running"])
        .optional(),
      direction,
      ...page,
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      const { octokit, target } = await client(repository);
      const { data } = await octokit.pulls.list({ ...target, ...input });

      return z
        .array(githubPullRequestSchema)
        .parse(await associated(context, ofRepository(data, repository)));
    },
  });

  const pullsListReviews = tool({
    name: "github_pulls_list_reviews",
    description:
      "List the reviews of a pull request, as GitHub's pulls.listReviews REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
      ...page,
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, input.pull_number, "automation");
      const { octokit, target } = await client(repository);
      const { data } = await octokit.pulls.listReviews({ ...target, ...input });

      return z.array(githubReviewSchema).parse(data);
    },
  });

  const pullsListReviewComments = tool({
    name: "github_pulls_list_review_comments",
    description:
      "List the inline review comments of a pull request, as GitHub's pulls.listReviewComments REST operation. in_reply_to_id identifies the root of a thread.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
      sort: z.enum(["created", "updated"]).optional(),
      direction,
      since: z.iso.datetime().optional(),
      ...page,
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, input.pull_number, "automation");
      const { octokit, target } = await client(repository);

      const { data } = await octokit.pulls.listReviewComments({
        ...target,
        ...input,
      });

      return z.array(githubReviewCommentSchema).parse(data);
    },
  });

  const reviewThreads = tool({
    name: "github_review_threads",
    description:
      "List the review threads of a pull request with their state, as GitHub's GraphQL PullRequest.reviewThreads. A thread's id identifies it to resolve it; its first comment's databaseId is the root review comment.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
    }),
    async execute({ repository: repositoryPath, pull_number }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, pull_number, "automation");
      const { octokit, target } = await client(repository);

      const { repository: data } = await octokit.graphql<{
        repository: { pullRequest: { reviewThreads: { nodes: unknown[] } } };
      }>(
        `query ($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) {
              reviewThreads(first: 100) {
                nodes {
                  id isResolved isOutdated path line
                  comments(first: 100) {
                    nodes { databaseId body author { login } createdAt }
                  }
                }
              }
            }
          }
        }`,
        { ...target, number: pull_number }
      );

      return z
        .array(reviewThreadSchema)
        .parse(data.pullRequest.reviewThreads.nodes);
    },
  });

  const issuesCreateComment = tool({
    name: "github_issues_create_comment",
    description:
      "Comment on an issue, or post a general comment on a pull request, as GitHub's issues.createComment REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_number: issueNumber,
      body: z.string().min(1),
    }),
    async execute({ repository: repositoryPath, issue_number, body }, context) {
      const repository = requireRepository(context, repositoryPath);

      const presentation = await requireIssue(
        context,
        repository,
        issue_number,
        "task"
      );

      const { octokit, target } = await client(repository);

      const { data: comment } = await octokit.issues.createComment({
        ...target,
        issue_number,
        body: effectService.withHeader(body, context),
      });

      await recordComment(
        context,
        repository,
        "issue_comment",
        presentation,
        comment
      );

      return githubCommentSchema.parse(comment);
    },
  });

  const issuesCreate = tool({
    name: "github_issues_create",
    description:
      "Open an issue, as GitHub's issues.create REST operation. The issue becomes associated with this task.",
    inputSchema: z.object({
      repository: repositoryInput,
      title: z.string().min(1),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      const { octokit, target } = await client(repository);
      const { data } = await octokit.issues.create({ ...target, ...input });

      const resource = githubIssueReference(
        repository.externalId,
        data.number,
        repository.host
      );

      const presentation = githubResourcePresentation(data);
      await taskService.associate(context.task, resource, presentation);
      await effectService.record(resource, presentation, context);

      return githubIssueSchema.parse(data);
    },
  });

  const issuesUpdate = tool({
    name: "github_issues_update",
    description:
      "Update an issue, as GitHub's issues.update REST operation. Labels and assignees replace the current ones.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_number: issueNumber,
      title: z.string().min(1).optional(),
      body: z.string().optional(),
      state: z.enum(["open", "closed"]).optional(),
      state_reason: z.enum(["completed", "not_planned", "reopened"]).optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional().describe("GitHub logins"),
    }),
    async execute(
      { repository: repositoryPath, issue_number, ...input },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIssue(context, repository, issue_number, "task");
      const { octokit, target } = await client(repository);

      const { data } = await octokit.issues.update({
        ...target,
        issue_number,
        ...input,
      });

      return githubIssueSchema.parse(data);
    },
  });

  const pullsCreate = tool({
    name: "github_pulls_create",
    description:
      "Open a pull request from a pushed branch, as GitHub's pulls.create REST operation. The pull request becomes associated with this task.",
    inputSchema: z.object({
      repository: repositoryInput,
      head: z.string().min(1),
      base: z.string().min(1),
      title: z.string().min(1),
      body: z.string().optional(),
      draft: z.boolean().optional(),
    }),
    async execute({ repository: repositoryPath, ...input }, context) {
      const repository = requireRepository(context, repositoryPath);
      const { octokit, target } = await client(repository);
      const { data } = await octokit.pulls.create({ ...target, ...input });

      const resource = githubIssueReference(
        repository.externalId,
        data.number,
        repository.host
      );

      const presentation = githubResourcePresentation(data);
      await taskService.associate(context.task, resource, presentation);
      await effectService.record(resource, presentation, context);

      return githubPullRequestSchema.parse(data);
    },
  });

  const pullsCreateReview = tool({
    name: "github_pulls_create_review",
    description:
      "Submit a review on a pull request at the commit you inspected, with inline comments on lines of its diff, as GitHub's pulls.createReview REST operation.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
      commit_id: z.string().regex(/^[a-f0-9]{40}$/u),
      body: z.string().optional(),
      event: z.enum(["COMMENT", "APPROVE", "REQUEST_CHANGES"]),
      comments: z
        .array(
          z.object({
            path: z.string().min(1),
            line: z.number().int().positive(),
            side: z.enum(["LEFT", "RIGHT"]).optional(),
            start_line: z.number().int().positive().optional(),
            start_side: z.enum(["LEFT", "RIGHT"]).optional(),
            body: z.string().min(1),
          })
        )
        .optional(),
    }),
    async execute(
      { repository: repositoryPath, pull_number, body, comments, ...input },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);

      const presentation = await requireIssue(
        context,
        repository,
        pull_number,
        "task"
      );

      const { octokit, target } = await client(repository);

      const { data: review } = await octokit.pulls.createReview({
        ...target,
        ...input,
        pull_number,
        body: body && effectService.withHeader(body, context),
        comments: comments?.map((comment) => ({
          ...comment,
          body: effectService.withHeader(comment.body, context),
        })),
      });

      // Its comments are effects too: they do not reactivate this automation.
      const reviewComments = await octokit.paginate(
        octokit.pulls.listCommentsForReview,
        { ...target, pull_number, review_id: review.id, per_page: 100 }
      );

      await effectService.record(
        githubReference("review", review.id, repository.host),
        { ...presentation, url: review.html_url },
        context
      );

      for (const comment of reviewComments) {
        await recordComment(
          context,
          repository,
          "review_comment",
          presentation,
          comment
        );
      }

      return githubReviewSchema.parse(review);
    },
  });

  const resolveReviewThread = tool({
    name: "github_resolve_review_thread",
    description:
      "Resolve a review thread that you opened, once its finding is fixed, as GitHub's GraphQL resolveReviewThread mutation.",
    inputSchema: z.object({
      repository: repositoryInput,
      thread_id: z.string().min(1).describe("The thread's GraphQL id"),
    }),
    async execute({ repository: repositoryPath, thread_id }, context) {
      const repository = requireRepository(context, repositoryPath);
      const { octokit } = await client(repository);

      const { node } = await octokit.graphql<{
        node: {
          pullRequest: { number: number; repository: { databaseId: number } };
          comments: { nodes: { databaseId: number }[] };
        } | null;
      }>(
        `query ($id: ID!) {
          node(id: $id) {
            ... on PullRequestReviewThread {
              pullRequest { number repository { databaseId } }
              comments(first: 1) { nodes { databaseId } }
            }
          }
        }`,
        { id: thread_id }
      );

      if (
        String(node?.pullRequest.repository.databaseId) !==
        repository.externalId
      ) {
        throw forbidden("RESOURCE_OUT_OF_SCOPE");
      }

      await requireIssue(context, repository, node!.pullRequest.number, "task");
      await effectService.requireThreadAuthor(
        githubReference(
          "review_comment",
          node!.comments.nodes[0]!.databaseId,
          repository.host
        ),
        context
      );

      const { resolveReviewThread: resolved } = await octokit.graphql<{
        resolveReviewThread: { thread: { id: string; isResolved: boolean } };
      }>(
        `mutation ($id: ID!) {
          resolveReviewThread(input: { threadId: $id }) {
            thread { id isResolved }
          }
        }`,
        { id: thread_id }
      );

      return resolved.thread;
    },
  });

  const pullsCreateReplyForReviewComment = tool({
    name: "github_pulls_create_reply_for_review_comment",
    description:
      "Reply in a review thread of a pull request, as GitHub's pulls.createReplyForReviewComment REST operation. comment_id is the thread's root comment.",
    inputSchema: z.object({
      repository: repositoryInput,
      pull_number: pullNumber,
      comment_id: z.number().int().positive(),
      body: z.string().min(1),
    }),
    async execute(
      { repository: repositoryPath, pull_number, comment_id, body },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);

      const presentation = await requireIssue(
        context,
        repository,
        pull_number,
        "task"
      );

      const { octokit, target } = await client(repository);

      const { data: comment } = await octokit.pulls.getReviewComment({
        ...target,
        comment_id,
      });

      if (!comment.pull_request_url.endsWith(`/pulls/${pull_number}`)) {
        throw forbidden("RESOURCE_OUT_OF_SCOPE");
      }

      const { data: reply } = await octokit.pulls.createReplyForReviewComment({
        ...target,
        pull_number,
        comment_id,
        body: effectService.withHeader(body, context),
      });

      await recordComment(
        context,
        repository,
        "review_comment",
        presentation,
        reply
      );

      return githubReviewCommentSchema.parse(reply);
    },
  });

  return {
    issuesGet,
    issuesListForRepo,
    issuesListComments,
    searchIssuesAndPullRequests,
    pullsGet,
    pullsList,
    pullsListReviews,
    pullsListReviewComments,
    reviewThreads,
    issuesCreateComment,
    issuesCreate,
    issuesUpdate,
    pullsCreate,
    pullsCreateReview,
    resolveReviewThread,
    pullsCreateReplyForReviewComment,
  };
}
