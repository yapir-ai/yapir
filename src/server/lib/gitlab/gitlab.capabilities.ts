import type { CapabilityDefinition } from "@server/lib/tools/capability-definition";

import {
  gitlabBranchResource,
  gitlabIssueResource,
  gitlabMergeRequestResource,
  gitlabProvider,
} from "./gitlab-event";
import { gitlabTools } from "./gitlab-tools";

export const gitlabPushCapability = "gitlab.code.push";

export function gitlabCapabilities(
  dependencies: Parameters<typeof gitlabTools>[0]
): CapabilityDefinition[] {
  const tools = gitlabTools(dependencies);
  const issues = { provider: gitlabProvider, resource: gitlabIssueResource };

  const mergeRequests = {
    provider: gitlabProvider,
    resource: gitlabMergeRequestResource,
  };

  return [
    {
      name: "gitlab.issues.read",
      scopable: true,
      ...issues,
      label: "Read issues",
      description: "Get and list the issues, and their notes",
      tools: [tools.issuesShow, tools.issuesList, tools.issueNotesList],
    },
    {
      name: "gitlab.merge_requests.read",
      scopable: true,
      ...mergeRequests,
      label: "Read merge requests",
      description:
        "Get and list the merge requests, with their diffs and discussions",
      tools: [
        tools.mergeRequestsShow,
        tools.mergeRequestsList,
        tools.mergeRequestsDiffs,
        tools.mergeRequestDiscussionsList,
      ],
    },
    {
      name: "gitlab.issues.comment",
      scopable: true,
      ...issues,
      label: "Comment",
      description: "Comment on the issues",
      tools: [tools.issueNotesCreate],
    },
    {
      name: "gitlab.issues.create",
      ...issues,
      label: "Create issue",
      description: "Open an issue and associate it with this task",
      tools: [tools.issuesCreate],
    },
    {
      name: "gitlab.issues.update",
      scopable: true,
      ...issues,
      label: "Update",
      description:
        "Change the title, description, labels, state and confidentiality of the issues",
      tools: [tools.issuesUpdate],
    },
    {
      name: "gitlab.issues.assign",
      scopable: true,
      ...issues,
      label: "Assign",
      description: "Assign the issues",
      tools: [tools.issuesEdit],
    },
    {
      name: gitlabPushCapability,
      provider: gitlabProvider,
      resource: gitlabBranchResource,
      label: "Push code",
      description: "Push branches to the project's repositories with Git",
      tools: [],
    },
    {
      name: "gitlab.merge_requests.create",
      ...mergeRequests,
      label: "Create merge request",
      description: "Open a merge request and associate it with this task",
      tools: [tools.mergeRequestsCreate],
    },
    {
      name: "gitlab.merge_requests.review",
      scopable: true,
      ...mergeRequests,
      label: "Review",
      description:
        "Review the merge requests: draft notes, publication, approval, and resolution of their threads",
      tools: [
        tools.mergeRequestDraftNotesCreate,
        tools.mergeRequestDraftNotesBulkPublish,
        tools.mergeRequestApprovalsApprove,
        tools.mergeRequestDiscussionsResolve,
      ],
    },
    {
      name: "gitlab.merge_requests.reply",
      scopable: true,
      ...mergeRequests,
      label: "Comment and reply",
      description:
        "Comment on the merge requests and reply to their discussion threads",
      tools: [
        tools.mergeRequestNotesCreate,
        tools.mergeRequestDiscussionsAddNote,
      ],
    },
    {
      name: "gitlab.merge_requests.assign",
      scopable: true,
      ...mergeRequests,
      label: "Assign",
      description: "Assign the merge requests",
      tools: [tools.mergeRequestsEdit],
    },
  ];
}
