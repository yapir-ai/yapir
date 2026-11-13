import { z } from "zod";

// The GitHub App installation Yapir acts as.
export const githubConnection = {
  settings: z.object({
    appId: z.coerce
      .number()
      .int()
      .positive()
      .meta({ title: "App ID", description: "On the App's General page." }),
    installationId: z.coerce.number().int().positive().meta({
      title: "Installation ID",
      description: "The number at the end of the installation URL.",
    }),
  }),
  secrets: z.object({
    privateKey: z.string().trim().min(1).meta({
      title: "Private key",
      description:
        "The content of a .pem file. Generate it on the App's General page.",
    }),
    webhookSecret: z.string().trim().min(1).meta({
      title: "Webhook secret",
      description: "The App's webhook secret.",
    }),
  }),
};
