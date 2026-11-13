import { z } from "zod";

// The GitLab instance, with the bot Yapir acts as.
export const gitlabConnection = {
  settings: z.object({
    url: z.url().meta({
      title: "URL",
      description: "The root URL of the instance, such as https://gitlab.com.",
    }),
  }),
  secrets: z.object({
    token: z.string().trim().min(1).meta({
      title: "Token",
      description: "A token with the api scope.",
    }),
  }),
  generated: z.object({
    webhookSigningToken: z
      .string()
      .startsWith("whsec_")
      .default(
        () =>
          `whsec_${btoa(String.fromCodePoint(...crypto.getRandomValues(new Uint8Array(32))))}`
      ),
  }),
};
