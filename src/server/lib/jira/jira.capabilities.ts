import type { CapabilityDefinition } from "@server/lib/tools/capability-definition";

import { jiraIssueResource, jiraProvider } from "./jira-event";
import { jiraTools } from "./jira-tools";

export function jiraCapabilities(
  dependencies: Parameters<typeof jiraTools>[0]
): CapabilityDefinition[] {
  const tools = jiraTools(dependencies);
  const metadata = { provider: jiraProvider, resource: jiraIssueResource };

  return [
    {
      name: "jira.issues.read",
      scopable: true,
      ...metadata,
      label: "Read issues",
      description: "Get and search the issues, and their comments",
      tools: [tools.issueGet, tools.searchJql, tools.issueCommentsList],
    },
    {
      name: "jira.issues.comment",
      scopable: true,
      ...metadata,
      label: "Comment",
      description: "Comment on the issues",
      tools: [tools.issueCommentAdd],
    },
    {
      name: "jira.issues.assign",
      scopable: true,
      ...metadata,
      label: "Assign",
      description: "Assign the issues",
      tools: [tools.issueAssign],
    },
  ];
}
