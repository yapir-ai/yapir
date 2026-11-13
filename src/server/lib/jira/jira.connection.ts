import { z } from "zod";

// The Jira Cloud site, with the service account Yapir acts as.
export const jiraConnection = {
  settings: z.object({
    url: z.url().meta({
      title: "URL",
      description: "The site URL, such as https://your-site.atlassian.net.",
    }),
    cloudId: z.string().trim().min(1).meta({
      title: "Cloud ID",
      description: "Find it at https://<site>.atlassian.net/_edge/tenant_info.",
    }),
  }),
  secrets: z.object({
    apiToken: z.string().trim().min(1).meta({
      title: "API token",
      description: "The API token of the service account.",
    }),
    webhookSecret: z.string().trim().min(1).meta({
      title: "Webhook secret",
      description: "The webhook secret.",
    }),
  }),
};
