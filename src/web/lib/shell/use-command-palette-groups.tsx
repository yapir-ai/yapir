import { hasProjectAccess, isOrganizationAdmin } from "@server/lib/auth/access";
import { onboardingPrompt } from "@server/lib/content/onboarding-prompt";
import { useLiveQuery } from "@tanstack/react-db";
import type { AppHotkey } from "@tanstack/react-hotkeys";
import { linkOptions, useNavigate, useParams } from "@tanstack/react-router";
import type { LinkOptions } from "@tanstack/react-router";
import { useTheme } from "@web/components/theme-provider";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { useCurrentAssistantChat } from "@web/lib/assistant/assistant-chat";
import { useSessionUser } from "@web/lib/auth/session";
import { automationsCollection } from "@web/lib/automations/automation.collection";
import { conversationListQuery } from "@web/lib/conversations/conversation.queries";
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { projectMemberInfoQuery } from "@web/lib/project-members/project-member.queries";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import { projectListQuery } from "@web/lib/projects/project.queries";
import { skillListQuery } from "@web/lib/skills/skill.queries";
import {
  Contrast,
  Copy,
  Keyboard,
  MessageSquare,
  MessageSquarePlus,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { appHotkeys } from "./app-hotkeys";
import { pageList, pages, projectPages } from "./navigation";
import { shortcutsDialog } from "./shortcuts-dialog";

export type CommandPaletteItem = {
  id: string;
  label: string;
  icon: ReactNode;
  project?: string;
  appHotkey?: AppHotkey;
} & ({ link: LinkOptions } | { run: () => Promise<void> | void });

interface CommandPaletteGroup {
  heading: string;
  items: CommandPaletteItem[];
}

export function useCommandPaletteGroups(): CommandPaletteGroup[] {
  const { projectId } = useParams({ strict: false });
  const projects = useLiveQuery(projectListQuery()).data ?? [];
  const project = projects.find(({ id }) => id === projectId);
  const projectNames = new Map(projects.map(({ id, name }) => [id, name]));
  const automations = useAutomations(projects.map(({ id }) => id));
  const agents = useLiveQuery(agentListQuery()).data ?? [];
  const skills = useLiveQuery(skillListQuery()).data ?? [];
  const modelProviders = useLiveQuery(modelProviderListQuery()).data ?? [];
  const conversations = useLiveQuery(conversationListQuery()).data ?? [];
  const actions = useActions(projectId);

  function group<T>(
    heading: string,
    rows: readonly T[],
    toItem: (row: T) => CommandPaletteItem
  ): CommandPaletteGroup {
    return { heading, items: rows.map(toItem) };
  }

  return [
    ...(project
      ? [
          group(project.name, projectPages, (page) => ({
            id: `page:${page.to}`,
            label: page.label,
            icon: <page.icon />,
            appHotkey: page.appHotkey,
            link: { to: page.to, params: { projectId: project.id } },
          })),
        ]
      : []),
    group("Navigation", pageList, (page) => ({
      id: `page:${page.to}`,
      label: page.label,
      icon: <page.icon />,
      appHotkey: page.appHotkey,
      link: { to: page.to },
    })),
    group("Projects", projects, ({ id, name }) => ({
      id,
      label: name,
      icon: <ProjectIcon project={{ id }} size="xs" />,
      link: { to: "/projects/$projectId", params: { projectId: id } },
    })),
    group("Automations", automations, (automation) => ({
      id: automation.id,
      label: automation.name,
      icon: <AgentIcon agent={{ id: automation.agentId }} size="xs" />,
      project: projectNames.get(automation.projectId),
      link: {
        to: "/projects/$projectId/automations/$automationId",
        params: {
          projectId: automation.projectId,
          automationId: automation.id,
        },
      },
    })),
    group("Agents", agents, (agent) => ({
      id: agent.id,
      label: agent.name,
      icon: <AgentIcon agent={agent} size="xs" />,
      link: { to: "/agents/$agentId", params: { agentId: agent.id } },
    })),
    group("Skills", skills, ({ skill }) => ({
      id: skill.id,
      label: skill.name,
      icon: <pages.skills.icon />,
      link: { to: "/skills/$skillId", params: { skillId: skill.id } },
    })),
    group("Model providers", modelProviders, ({ id, name, catalogId }) => ({
      id,
      label: name,
      icon: <ModelProviderIcon catalogId={catalogId} size="xs" />,
      link: {
        to: "/model-providers/$modelProviderId",
        params: { modelProviderId: id },
      },
    })),
    group("Assistant conversations", conversations, ({ id, title }) => ({
      id,
      label: title ?? "New conversation",
      icon: <MessageSquare />,
      link: {
        to: "/assistant/$conversationId",
        params: { conversationId: id },
      },
    })),
    { heading: "Actions", items: actions },
  ];
}

function useAutomations(projectIds: string[]) {
  const { data } = useLiveQuery({
    query: (q) => {
      const [first, ...rest] = projectIds.map((projectId) =>
        q
          .from({ [projectId]: automationsCollection(projectId) })
          .select((refs) => ({ ...refs[projectId]! }))
      );

      return first && q.unionAll(first, ...rest);
    },
  });

  return (data ?? []).filter(({ deletedAt }) => deletedAt === null);
}

function useActions(projectId: string | undefined): CommandPaletteItem[] {
  const navigate = useNavigate();
  const { startConversation } = useCurrentAssistantChat();
  const { setTheme } = useTheme();
  const user = useSessionUser();
  const isAdmin = isOrganizationAdmin(user);

  const { data: member } = useLiveQuery({
    query: (q) =>
      projectId
        ? projectMemberInfoQuery(projectId, user.id).query(q)
        : undefined,
  });

  const dark = document.documentElement.classList.contains("dark");

  const adminActions: CommandPaletteItem[] = [
    {
      id: "action:create-project",
      label: "Create project",
      icon: <Plus />,
      link: { to: "/projects/create" },
    },
    {
      id: "action:create-agent",
      label: "Create agent",
      icon: <Plus />,
      link: { to: "/agents/create" },
    },
    {
      id: "action:add-model-provider",
      label: "Add model provider",
      icon: <Plus />,
      link: { to: "/model-providers/create" },
    },
    {
      id: "action:add-mcp-server",
      label: "Add MCP server",
      icon: <Plus />,
      link: { to: "/connections/mcp/create" },
    },
    {
      id: "action:add-webhook",
      label: "Add webhook",
      icon: <Plus />,
      link: { to: "/connections/webhooks/create" },
    },
  ];

  return [
    {
      id: "action:new-conversation",
      label: "New Assistant conversation",
      icon: <MessageSquarePlus />,
      run: async () => {
        startConversation();

        return await navigate({ to: "/assistant" });
      },
    },
    ...(projectId && hasProjectAccess("write", user, member)
      ? [
          {
            id: "action:create-automation",
            label: "Create automation",
            icon: <Plus />,
            link: linkOptions({
              to: "/projects/$projectId/automations/create",
              params: { projectId },
            }),
          },
        ]
      : []),
    {
      id: "action:create-skill",
      label: "Create skill",
      icon: <Plus />,
      link: { to: "/skills/create" },
    },
    ...(isAdmin ? adminActions : []),
    {
      id: "action:toggle-theme",
      label: dark ? "Switch to light theme" : "Switch to dark theme",
      icon: <Contrast />,
      run: () => setTheme(dark ? "light" : "dark"),
    },
    {
      id: "action:copy-onboarding-prompt",
      label: "Copy the onboarding prompt",
      icon: <Copy />,
      run: async () => {
        await navigator.clipboard.writeText(
          onboardingPrompt(window.location.origin)
        );
        toast.success("Onboarding prompt copied");
      },
    },
    {
      id: "action:show-shortcuts",
      label: "Show keyboard shortcuts",
      icon: <Keyboard />,
      appHotkey: appHotkeys["shortcuts.open"],
      run: () => shortcutsDialog.open(null),
    },
  ];
}
