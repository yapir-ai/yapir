import type { CapabilityDefinition } from "@server/lib/tools/capability-definition";

import {
  githubBranchResource,
  githubIssueResource,
  githubProvider,
  githubPullRequestResource,
} from "./github-event";
import { githubTools } from "./github-tools";

export const githubPushCapability = "github.code.push";

export function githubCapabilities(
  dependencies: Parameters<typeof githubTools>[0]
): CapabilityDefinition[] {
  const tools = githubTools(dependencies);
  const issues = { provider: githubProvider, resource: githubIssueResource };

  const pulls = {
    provider: githubProvider,
    resource: githubPullRequestResource,
  };

  return [
    {
      name: "github.issues.read",
      scopable: true,
      ...issues,
      label: "Read issues",
      description: "Get, list and search the issues, and their comments",
      tools: [
        tools.issuesGet,
        tools.issuesListForRepo,
        tools.issuesListComments,
        tools.searchIssuesAndPullRequests,
      ],
    },
    {
      name: "github.pull_requests.read",
      scopable: true,
      ...pulls,
      label: "Read pull requests",
      description:
        "Get and list the pull requests, with their diffs, comments, reviews and review threads",
      tools: [
        tools.pullsGet,
        tools.pullsList,
        tools.pullsListReviews,
        tools.pullsListReviewComments,
        tools.issuesListComments,
        tools.reviewThreads,
      ],
    },
    {
      name: "github.issues.comment",
      scopable: true,
      ...issues,
      label: "Comment",
      description: "Comment on the issues",
      tools: [tools.issuesCreateComment],
    },
    {
      name: "github.issues.create",
      ...issues,
      label: "Create issue",
      description: "Open an issue and associate it with this task",
      tools: [tools.issuesCreate],
    },
    {
      name: "github.issues.update",
      scopable: true,
      ...issues,
      label: "Update",
      description:
        "Change the title, body, labels, state and assignees of the issues",
      tools: [tools.issuesUpdate],
    },
    {
      name: githubPushCapability,
      provider: githubProvider,
      resource: githubBranchResource,
      label: "Push code",
      description: "Push branches to the project's repositories with Git",
      tools: [],
    },
    {
      name: "github.pull_requests.create",
      ...pulls,
      label: "Create pull request",
      description: "Open a pull request and associate it with this task",
      tools: [tools.pullsCreate],
    },
    {
      name: "github.pull_requests.review",
      scopable: true,
      ...pulls,
      label: "Submit review",
      description:
        "Submit reviews on the pull requests and resolve their threads",
      tools: [tools.pullsCreateReview, tools.resolveReviewThread],
    },
    {
      name: "github.pull_requests.reply",
      scopable: true,
      ...pulls,
      label: "Comment and reply",
      description:
        "Comment on the pull requests and reply to their review threads",
      tools: [
        tools.issuesCreateComment,
        tools.pullsCreateReplyForReviewComment,
      ],
    },
  ];
}
