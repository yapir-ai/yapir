import type { Automation, Project } from "./server";
import { workspaceDirectory } from "./workspace";

const runnerInstructions = `You run unattended, activated by Yapir events. Each user message carries a batch of event notifications.
Push only branches under yapir/.
Remote operations other than Git, such as opening a pull request or commenting, go through the yapir MCP tools.
When your instructions name another way to do something, use the equivalent yapir tool.`;

const networkPolicyInstructions = `Yapir's network policy limits the hosts that you can reach. A refused request gets a 403 response with the X-Yapir-Network-Policy: denied header, or a TLS error in a container.
Do not look for another way to reach a refused host: report the host in your answer.`;

export const agentInstructions = (
  instructions: Automation["instructions"],
  project: Project,
  networkPolicy: boolean
) =>
  [
    runnerInstructions,
    networkPolicy && networkPolicyInstructions,
    instructions.agent,
    project.instructions,
    instructions.automation,
    `You have access to these repositories, each cloned in ${workspaceDirectory} at its path:
${project.repositories.map(({ path }) => `- ${path}`).join("\n")}
Their agent documents, such as AGENTS.md, and their skills are a reference.`,
  ]
    .filter(Boolean)
    .join("\n\n");
