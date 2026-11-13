import { isOrganizationAdmin } from "@server/lib/auth/access";
import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  needsAttentionQuery,
  runningNowQuery,
} from "@web/lib/activity/activity.queries";
import { ExecutionActivity } from "@web/lib/activity/execution-activity";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { apiKeyListQuery } from "@web/lib/api-keys/api-key.queries";
import { AssistantPrompt } from "@web/lib/assistant/assistant-prompt";
import { useSessionUser } from "@web/lib/auth/session";
import { connectionListQuery } from "@web/lib/connections/connection.queries";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { CodingAgentOnboarding } from "@web/lib/home/coding-agent-onboarding";
import { SetupChecklist } from "@web/lib/home/setup-checklist";
import { CostSummary } from "@web/lib/metrics/metrics-summary";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { projectListQuery } from "@web/lib/projects/project.queries";

export const Route = createFileRoute("/")({
  loader: async ({ context: { dbClient, session } }) =>
    await Promise.all([
      dbClient.preloadLiveQuery(needsAttentionQuery()),
      dbClient.preloadLiveQuery(runningNowQuery()),
      dbClient.preloadLiveQuery(defaultsQuery()),
      dbClient.preloadLiveQuery(apiKeyListQuery),
      ...(isOrganizationAdmin(session.user)
        ? [
            dbClient.preloadLiveQuery(modelProviderListQuery()),
            dbClient.preloadLiveQuery(connectionListQuery),
            dbClient.preloadLiveQuery(projectListQuery()),
            dbClient.preloadLiveQuery(agentListQuery()),
          ]
        : []),
    ]),
  staticData: {
    breadcrumb: "Home",
    description:
      "Home: the remaining setup step, the prompt that connects a coding agent, a prompt to the Assistant, the cost of the last 30 days by project, and the running and failed tasks across projects.",
  },
  component: HomePage,
});

function HomePage() {
  const user = useSessionUser();

  return (
    <Page>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`}>
        <CodingAgentOnboarding />
      </PageHeader>
      {isOrganizationAdmin(user) && <SetupChecklist />}
      <AssistantPrompt />
      <CostSummary filters={{}} groupBy="projectId" />
      <ExecutionActivity />
    </Page>
  );
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  return hour < 18 ? "Good afternoon" : "Good evening";
}
