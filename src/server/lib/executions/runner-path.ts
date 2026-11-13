export const apiPath = "/api";

export const runnerMount = "/runner";

export const runnerPath = `${apiPath}${runnerMount}`;

export const runnerCallPath = {
  claim: "/claim",
  pull: "/pull",
  turnEnd: "/turn-end",
  fail: "/fail",
} as const;

// The server routes under the runner path that the agent reaches through the runner's proxy.
export const agentPath = {
  git: "/git",
  model: "/model",
  mcp: "/mcp",
  messages: "/messages",
  session: "/session",
} as const;

// Harnesses reach their model provider under the proxy, followed by the base URL's path.
export const basePath = (baseUrl: URL) => baseUrl.pathname.replace(/\/$/u, "");

export const modelProxyPath = (baseUrl: string) =>
  `${runnerPath}${agentPath.model}${basePath(new URL(baseUrl))}`;
