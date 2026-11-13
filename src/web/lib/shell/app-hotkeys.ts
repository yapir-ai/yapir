import { defineAppHotkeys } from "@tanstack/react-hotkeys";

const definitions = {
  "palette.open": {
    hotkey: "Mod+K",
    meta: { name: "Open the command palette", group: "General" },
    options: { requireReset: true },
  },
  "assistant.toggle": {
    hotkey: "Mod+J",
    meta: { name: "Open or close the Assistant", group: "General" },
    options: { requireReset: true },
  },
  "shortcuts.open": {
    hotkey: "?",
    meta: { name: "Show keyboard shortcuts", group: "General" },
  },
  "list.search": {
    hotkey: "/",
    meta: { name: "Search the list", group: "Lists" },
  },
  "list.create": {
    hotkey: "C",
    meta: { name: "Create a resource", group: "Lists" },
  },
  "go.home": {
    hotkey: ["G", "H"],
    meta: { name: "Go to Home", group: "Navigation" },
  },
  "go.projects": {
    hotkey: ["G", "P"],
    meta: { name: "Go to Projects", group: "Navigation" },
  },
  "go.assistant": {
    hotkey: ["G", "A"],
    meta: { name: "Go to Assistant", group: "Navigation" },
  },
  "go.metrics": {
    hotkey: ["G", "T"],
    meta: { name: "Go to Metrics", group: "Navigation" },
  },
  "go.agents": {
    hotkey: ["G", "E"],
    meta: { name: "Go to Agents", group: "Navigation" },
  },
  "go.skills": {
    hotkey: ["G", "S"],
    meta: { name: "Go to Skills", group: "Navigation" },
  },
  "go.modelProviders": {
    hotkey: ["G", "M"],
    meta: { name: "Go to Model providers", group: "Navigation" },
  },
  "go.defaults": {
    hotkey: ["G", "D"],
    meta: { name: "Go to Defaults", group: "Navigation" },
  },
  "go.networkPolicy": {
    hotkey: ["G", "N"],
    meta: { name: "Go to Network policy", group: "Navigation" },
  },
  "go.connections": {
    hotkey: ["G", "C"],
    meta: { name: "Go to Connections", group: "Navigation" },
  },
  "go.users": {
    hotkey: ["G", "U"],
    meta: { name: "Go to Users", group: "Navigation" },
  },
  "go.apiKeys": {
    hotkey: ["G", "K"],
    meta: { name: "Go to API keys", group: "Navigation" },
  },
  "go.changelog": {
    hotkey: ["G", "L"],
    meta: { name: "Go to Changelog", group: "Navigation" },
  },
  "project.overview": {
    hotkey: ["P", "O"],
    meta: { name: "Go to Overview", group: "Project" },
  },
  "project.tasks": {
    hotkey: ["P", "T"],
    meta: { name: "Go to Tasks", group: "Project" },
  },
  "project.automations": {
    hotkey: ["P", "A"],
    meta: { name: "Go to Automations", group: "Project" },
  },
  "project.repositories": {
    hotkey: ["P", "R"],
    meta: { name: "Go to Repositories", group: "Project" },
  },
  "project.members": {
    hotkey: ["P", "M"],
    meta: { name: "Go to Members", group: "Project" },
  },
  "project.settings": {
    hotkey: ["P", "S"],
    meta: { name: "Go to Settings", group: "Project" },
  },
} as const;

export const appHotkeys = defineAppHotkeys(definitions);

declare module "@tanstack/react-hotkeys" {
  interface Register {
    appHotkeys: typeof appHotkeys;
  }
}
