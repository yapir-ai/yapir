import { onboardingPrompt } from "@server/lib/content/onboarding-prompt";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { CopySnippet } from "@web/components/copy-snippet";
import { Button } from "@web/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@web/components/ui/dialog";
import { apiKeyListQuery } from "@web/lib/api-keys/api-key.queries";
import { Terminal } from "lucide-react";

export function CodingAgentOnboarding() {
  const { data: apiKeys } = useLiveSuspenseQuery(apiKeyListQuery);

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant={apiKeys.length > 0 ? "outline" : "default"} />}
      >
        <Terminal data-icon="inline-start" />
        Connect coding agent
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect your coding agent</DialogTitle>
          <DialogDescription>
            Paste this prompt into your coding agent, such as Claude Code or
            Codex, in your project. It installs the Yapir CLI and sets up the
            project with you.
          </DialogDescription>
        </DialogHeader>
        <CopySnippet
          aria-label="Prompt for your coding agent"
          code={onboardingPrompt(window.location.origin)}
        />
      </DialogContent>
    </Dialog>
  );
}
