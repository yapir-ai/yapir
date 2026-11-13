import type { ConnectionSelect } from "@server/lib/db/schema";
import { githubConnection } from "@server/lib/github/github.connection";
import { gitlabConnection } from "@server/lib/gitlab/gitlab.connection";
import { jiraConnection } from "@server/lib/jira/jira.connection";
import { z } from "zod";

export const ConnectionTypeSchema = z
  .enum(["github", "gitlab", "jira"])
  .describe("The connected service, which identifies its connection");

export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;

// Each type's fields: its secrets are write-only and encrypted at rest, its generated secrets are Yapir's own.
export const connectionDefinitions = {
  github: githubConnection,
  gitlab: gitlabConnection,
  jira: jiraConnection,
} satisfies Record<
  ConnectionType,
  { settings: z.ZodObject; secrets: z.ZodObject; generated?: z.ZodObject }
>;

// Each type's fields a request gives, flat.
export const connectionFields = {
  github: z.strictObject({
    ...githubConnection.settings.shape,
    ...githubConnection.secrets.shape,
  }),
  gitlab: z.strictObject({
    ...gitlabConnection.settings.shape,
    ...gitlabConnection.secrets.shape,
  }),
  jira: z.strictObject({
    ...jiraConnection.settings.shape,
    ...jiraConnection.secrets.shape,
  }),
};

export const ConnectionSchema = z.discriminatedUnion("type", [
  connectionFields.github.extend({ type: z.literal("github") }),
  connectionFields.gitlab.extend({
    ...gitlabConnection.generated.shape,
    type: z.literal("gitlab"),
  }),
  connectionFields.jira.extend({ type: z.literal("jira") }),
]);

export type Connection = z.infer<typeof ConnectionSchema>;

export type ConnectionOf<T extends ConnectionType> = Extract<
  Connection,
  { type: T }
>;

export const findConnection = <T extends ConnectionType>(
  connections: Connection[],
  type: T
) =>
  connections.find(
    (connection): connection is ConnectionOf<T> => connection.type === type
  );

export type ConnectionSettings = z.infer<
  (typeof connectionDefinitions)[ConnectionType]["settings"]
>;

// The stored row of a Connection: its settings, and its secrets apart, generated when absent.
export function toConnectionRow(connection: z.input<typeof ConnectionSchema>) {
  const definition = connectionDefinitions[connection.type];

  return {
    type: connection.type,
    settings: definition.settings.parse(connection),
    secrets: JSON.stringify({
      ...definition.secrets.parse(connection),
      ...("generated" in definition && definition.generated.parse(connection)),
    }),
  };
}

export const toConnection = ({ type, settings, secrets }: ConnectionSelect) =>
  ConnectionSchema.parse({ type, ...settings, ...JSON.parse(secrets) });

// The secrets are write-only.
export const toResponseDto = ({
  type,
  settings,
}: Omit<ConnectionSelect, "secrets">) => ({ type, ...settings });

export type ConnectionResponseDto = ReturnType<typeof toResponseDto>;
