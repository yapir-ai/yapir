import { fitsProject } from "@server/lib/git/repository-provider";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@web/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemMedia,
  ItemTitle,
} from "@web/components/ui/item";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { toastError } from "@web/lib/errors";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { useTransition } from "react";

import { automationEventsQuery } from "./automation-catalog.queries";
import { automationListQuery } from "./automation.queries";
import { useAutomationInsert } from "./use-automation-insert";

export function AutomationAgentGallery({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const insertAutomation = useAutomationInsert(projectId);
  const { data: agents } = useLiveSuspenseQuery(agentListQuery());
  const { data: events } = useLiveSuspenseQuery(automationEventsQuery);

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  const { data: automations } = useLiveSuspenseQuery(
    automationListQuery(projectId)
  );

  const usedAgentIds = new Set(
    automations.map(({ automation }) => automation.agentId)
  );

  const fittingTypes = new Set(
    events
      .filter((event) => fitsProject(event, { repositories }))
      .map(({ type }) => type)
  );

  const suggested = agents.filter(
    ({ id, triggers }) =>
      !usedAgentIds.has(id) &&
      triggers.some(({ type }) => fittingTypes.has(type))
  );

  if (suggested.length === 0) {
    return null;
  }

  return (
    <ItemGroup aria-label="Agents to start from">
      {suggested.map((agent) => (
        <Item key={agent.id} role="listitem" variant="outline" size="sm">
          <ItemMedia>
            <AgentIcon agent={agent} size="xs" />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle>
              <ItemLink to="/agents/$agentId" params={{ agentId: agent.id }}>
                {agent.name}
              </ItemLink>
            </ItemTitle>
            {agent.description && (
              <ItemDescription>{agent.description}</ItemDescription>
            )}
          </ItemContent>
          <ItemActions>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const automationId = await insertAutomation({
                    name: agent.name,
                    agentId: agent.id,
                  }).catch(toastError);

                  if (automationId) {
                    await navigate({
                      to: "/projects/$projectId/automations/$automationId",
                      params: { projectId, automationId },
                    });
                  }
                })
              }
            >
              Create automation
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
