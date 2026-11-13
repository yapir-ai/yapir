import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@web/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@web/components/ui/item";
import { Status } from "@web/components/ui/status";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { connectionListQuery } from "@web/lib/connections/connection.queries";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { projectListQuery } from "@web/lib/projects/project.queries";
import type { Repository } from "@web/lib/repositories/repository.collection";
import { CircleDashed } from "lucide-react";

const gitHostTypes: string[] = [
  "github",
  "gitlab",
] satisfies Repository["provider"][];

export function SetupChecklist() {
  const { data: modelProviders } = useLiveSuspenseQuery(
    modelProviderListQuery()
  );

  const { data: defaults } = useLiveSuspenseQuery(defaultsQuery());
  const { data: connections } = useLiveSuspenseQuery(connectionListQuery);
  const { data: projects } = useLiveSuspenseQuery(projectListQuery());
  const { data: agents } = useLiveSuspenseQuery(agentListQuery());

  const steps = [
    {
      description: "Give the Assistant and agents access to models.",
      done: modelProviders.length > 0,
      action: "Add a model provider",
      to: "/model-providers/create",
    },
    {
      description:
        "Choose the model the Assistant answers with and new agents start with.",
      done: Boolean(defaults?.modelProviderId),
      action: "Configure defaults",
      to: "/defaults",
    },
    {
      description: "Connect GitHub or a GitLab instance.",
      done: connections.some(({ type }) => gitHostTypes.includes(type)),
      action: "Connect a Git host",
      to: "/connections",
    },
    {
      description: "Group repositories of the Git host in a project.",
      done: projects.length > 0,
      action: "Create a project",
      to: "/projects/create",
    },
    {
      description: "Configure instructions, a model and a harness.",
      done: agents.length > 0,
      action: "Create an agent",
      to: "/agents/create",
    },
  ] as const;

  const next = steps.find(({ done }) => !done);

  if (!next) {
    return null;
  }

  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="icon">
        <Status tone="muted" aria-hidden="true">
          <CircleDashed />
        </Status>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          Set up Yapir: {steps.filter(({ done }) => done).length} of{" "}
          {steps.length} steps done
        </ItemTitle>
        <ItemDescription>Next: {next.description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Link to={next.to} className={buttonVariants({ size: "sm" })}>
          {next.action}
        </Link>
      </ItemActions>
    </Item>
  );
}
