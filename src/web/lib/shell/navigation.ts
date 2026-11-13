import {
  Bot,
  ChartColumn,
  FolderGit2,
  GitBranch,
  History,
  House,
  KeyRound,
  KeySquare,
  LayoutDashboard,
  ListTodo,
  NotebookText,
  Plug,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

import { appHotkeys } from "./app-hotkeys";

export const pages = {
  home: {
    to: "/",
    label: "Home",
    icon: House,
    appHotkey: appHotkeys["go.home"],
    fuzzy: false,
  },
  projects: {
    to: "/projects",
    label: "Projects",
    icon: FolderGit2,
    appHotkey: appHotkeys["go.projects"],
    fuzzy: false,
  },
  metrics: {
    to: "/metrics",
    label: "Metrics",
    icon: ChartColumn,
    appHotkey: appHotkeys["go.metrics"],
    fuzzy: false,
  },
  assistant: {
    to: "/assistant",
    label: "Assistant",
    icon: Sparkles,
    appHotkey: appHotkeys["go.assistant"],
    fuzzy: true,
  },
  agents: {
    to: "/agents",
    label: "Agents",
    icon: Bot,
    appHotkey: appHotkeys["go.agents"],
    fuzzy: true,
  },
  skills: {
    to: "/skills",
    label: "Skills",
    icon: NotebookText,
    appHotkey: appHotkeys["go.skills"],
    fuzzy: true,
  },
  modelProviders: {
    to: "/model-providers",
    label: "Model providers",
    icon: KeyRound,
    appHotkey: appHotkeys["go.modelProviders"],
    fuzzy: true,
  },
  defaults: {
    to: "/defaults",
    label: "Defaults",
    icon: SlidersHorizontal,
    appHotkey: appHotkeys["go.defaults"],
    fuzzy: false,
  },
  networkPolicy: {
    to: "/network-policy",
    label: "Network policy",
    icon: ShieldCheck,
    appHotkey: appHotkeys["go.networkPolicy"],
    fuzzy: false,
  },
  connections: {
    to: "/connections",
    label: "Connections",
    icon: Plug,
    appHotkey: appHotkeys["go.connections"],
    fuzzy: true,
  },
  users: {
    to: "/users",
    label: "Users",
    icon: Users,
    appHotkey: appHotkeys["go.users"],
    fuzzy: false,
  },
  apiKeys: {
    to: "/api-keys",
    label: "API keys",
    icon: KeySquare,
    appHotkey: appHotkeys["go.apiKeys"],
    fuzzy: false,
  },
  changelog: {
    to: "/changelog",
    label: "Changelog",
    icon: History,
    appHotkey: appHotkeys["go.changelog"],
    fuzzy: false,
  },
} as const;

export type NavigationPage = (typeof pages)[keyof typeof pages];

export const pageList: NavigationPage[] = Object.values(pages);

export const projectPages = [
  {
    to: "/projects/$projectId",
    label: "Overview",
    icon: LayoutDashboard,
    appHotkey: appHotkeys["project.overview"],
    fuzzy: false,
  },
  {
    to: "/projects/$projectId/tasks",
    label: "Tasks",
    icon: ListTodo,
    appHotkey: appHotkeys["project.tasks"],
    fuzzy: true,
  },
  {
    to: "/projects/$projectId/automations",
    label: "Automations",
    icon: Workflow,
    appHotkey: appHotkeys["project.automations"],
    fuzzy: true,
  },
  {
    to: "/projects/$projectId/repositories",
    label: "Repositories",
    icon: GitBranch,
    appHotkey: appHotkeys["project.repositories"],
    fuzzy: false,
  },
  {
    to: "/projects/$projectId/members",
    label: "Members",
    icon: UsersRound,
    appHotkey: appHotkeys["project.members"],
    fuzzy: false,
  },
  {
    to: "/projects/$projectId/settings",
    label: "Settings",
    icon: Settings,
    appHotkey: appHotkeys["project.settings"],
    fuzzy: false,
  },
] as const;
