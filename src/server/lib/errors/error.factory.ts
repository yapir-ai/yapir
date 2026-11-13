import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const ErrorCodes = {
  CONTENT_NOT_FOUND: "Content could not be found",
  AUTOMATION_DELETED: "This automation is deleted",
  AUTOMATION_DISABLED: "This automation is disabled",
  AGENT_DELETED: "This agent is deleted",
  AUTOMATION_NOT_FOUND: "Automation could not be found",
  AUTOMATION_REQUIRES_TRIGGER:
    "An enabled automation requires at least one trigger",
  AGENT_NOT_FOUND: "Agent could not be found",
  AGENT_IN_USE: "This agent is used by an automation",
  MODEL_PROVIDER_DELETED: "This model provider is deleted",
  MODEL_PROVIDER_NOT_FOUND: "Model provider could not be found",
  MODEL_PROVIDER_IN_USE:
    "This model provider is used by an agent or the defaults",
  ASSISTANT_MODEL_UNSUPPORTED: "The Assistant cannot drive this model",
  DEFAULTS_INCOMPLETE: "The defaults require a model provider and a model",
  DEFAULTS_NOT_CONFIGURED:
    "An Organization Admin must choose the default model first",
  SKILL_NOT_FOUND: "Skill could not be found",
  SKILL_DELETED: "This skill is deleted",
  SKILL_AUTHOR_REQUIRED:
    "Only the skill's author or an Organization Admin can do this",
  SKILL_NAME_CONFLICT: "An agent cannot select two skills with the same name",
  MCP_SERVER_NOT_FOUND: "MCP server could not be found",
  MCP_SERVER_DELETED: "This MCP server is deleted",
  MCP_SERVER_SLUG_TAKEN: "Another MCP server has this slug",
  FIXED_IP_UNAVAILABLE: "This instance has no fixed IP",
  WEBHOOK_NOT_FOUND: "Webhook could not be found or is deleted",
  WEBHOOK_BODY_INVALID: "The delivery's body is not JSON",
  CONNECTION_NOT_FOUND: "Connection could not be found",
  CONNECTION_EXISTS: "This type of connection already exists",
  CONNECTION_INVALID: "This connection's fields are not valid for its type",
  CONVERSATION_NOT_FOUND: "Conversation could not be found",
  PROJECT_NOT_FOUND: "Project could not be found",
  PROJECT_DELETED: "This project is deleted",
  REPOSITORY_NOT_FOUND: "Repository could not be found",
  REPOSITORY_IN_USE:
    "An automation of this project runs its executions in the CI of this repository",
  REPOSITORY_OUT_OF_SCOPE:
    "This repository does not belong to the project of the current Task",
  PROJECT_REPOSITORY_EXISTS: "This repository already belongs to this project",
  PROJECT_CI_REPOSITORY_INVALID: "The CI repository must belong to the project",
  CI_REPOSITORY_INVALID:
    "A CI execution environment requires a CI repository, which must belong to the automation's project",
  UNKNOWN_EVENT_TYPE: "This event type is not registered",
  UNKNOWN_CAPABILITY: "This capability is not registered",
  UNKNOWN_DISPATCHER: "This dispatcher is not registered",
  GIT_HOST_MISMATCH:
    "This trigger, capability, dispatcher or repository belongs to another Git host than the project's",
  TASK_NOT_FOUND: "Task could not be found",
  TASK_SESSION_NOT_FOUND:
    "This task has no saved session: none of its executions finished a turn",
  RESOURCE_OUT_OF_SCOPE:
    "This resource is not associated with the current Task or, for reads, with a Task of its Automation",
  RESOURCE_ALREADY_ASSOCIATED:
    "This resource belongs to another Task in this Automation",
  THREAD_NOT_OWNED: "Only the agent that opened this thread can resolve it",
  EXECUTION_CLAIM_INVALID: "This execution does not exist for this claim ID",
  EXECUTION_TOKEN_INVALID: "This execution token is not valid",
  RUNNER_IDENTITY_INVALID:
    "The runner does not prove that it runs in the dispatched environment",
  GIT_HOST_NOT_FOUND: "The repository's Git host is not configured",
  GIT_OPERATION_FORBIDDEN: "This Git operation is not allowed",
  GIT_PUSH_FORBIDDEN:
    "Pushes must target only yapir/* branches with unencoded commands",
  GIT_UPSTREAM_REDIRECT: "Git upstream redirects are not allowed",
  MODEL_PATH_FORBIDDEN:
    "Model requests must target the model provider's base URL",
  MODEL_UPSTREAM_REDIRECT: "Model upstream redirects are not allowed",
  INVALID_TRIGGER_FILTER:
    "A trigger must contain a valid cron pattern or boolean CEL expression for its event type",
  UNAUTHENTICATED: "Sign in to access this resource",
  WEBHOOK_SIGNATURE_INVALID: "This webhook delivery has no valid signature",
  ORGANIZATION_ADMIN_REQUIRED: "Only Organization Admins can do this",
  USER_NOT_FOUND: "User could not be found",
  USER_ROLE_CONFIGURED:
    "This Organization Admin is designated by the instance configuration",
  PROJECT_MEMBER_EXISTS: "This user is already a member of this project",
  PROJECT_MEMBER_NOT_FOUND: "Project member could not be found",
} as const satisfies Record<string, string>;

export type ErrorCode = keyof typeof ErrorCodes;

function httpError(
  errorCode: ErrorCode,
  status: ContentfulStatusCode,
  detail: string = ErrorCodes[errorCode]
) {
  const problemDetail = { title: errorCode, status, detail };

  return new HTTPException(status, {
    message: detail,
    res: Response.json(problemDetail, { status }),
  });
}

export const notFound = (errorCode: ErrorCode) => httpError(errorCode, 404);
export const conflict = (errorCode: ErrorCode) => httpError(errorCode, 409);
export const unauthorized = (errorCode: ErrorCode) => httpError(errorCode, 401);

export const badRequest = (errorCode: ErrorCode, detail?: string) =>
  httpError(errorCode, 400, detail);

export const forbidden = (errorCode: ErrorCode) => httpError(errorCode, 403);
