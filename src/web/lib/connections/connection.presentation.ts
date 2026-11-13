import { connectionDefinitions } from "@server/lib/connections/connection.dto";
import type { ConnectionType } from "@server/lib/connections/connection.dto";
import type { z } from "zod";

export const connectionLabels: Record<ConnectionType, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  jira: "Jira",
};

// A private key spans several lines, which a password input would strip.
const secretInput = (name: string) =>
  name === "privateKey"
    ? { multiline: true }
    : { type: "password", autoComplete: "off" };

// The fields of a Connection type, presented with their schema's metadata.
export function connectionFormFields(
  type: ConnectionType,
  part: "settings" | "secrets"
) {
  return Object.entries<z.ZodType>(connectionDefinitions[type][part].shape).map(
    ([name, schema]) => {
      const { title = name, description } = schema.meta() ?? {};

      return {
        name,
        schema,
        props: {
          label: title,
          description,
          ...(part === "secrets" && secretInput(name)),
        },
      };
    }
  );
}
