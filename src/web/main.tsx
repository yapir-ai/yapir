import { QueryClient } from "@tanstack/query-core";
import { DbClient, DbProvider } from "@tanstack/react-db";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ThemeProvider } from "@web/components/theme-provider";
import { Toaster } from "@web/components/ui/sonner";
import { AssistantChatProvider } from "@web/lib/assistant/assistant-chat";
import { AssistantNudgeProvider } from "@web/lib/assistant/assistant-nudge";
import { appHotkeys } from "@web/lib/shell/app-hotkeys";
import { RouteError } from "@web/lib/shell/route-error";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import "./main.css";

import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();
const dbClient = new DbClient({ queryClient });

const router = createRouter({
  routeTree,
  context: { dbClient, queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: RouteError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.querySelector("#root")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <DbProvider client={dbClient}>
          <AssistantChatProvider>
            <AssistantNudgeProvider>
              <HotkeysProvider appHotkeys={appHotkeys}>
                <RouterProvider router={router} />
              </HotkeysProvider>
            </AssistantNudgeProvider>
          </AssistantChatProvider>
        </DbProvider>
        <Toaster position="top-right" />
      </ThemeProvider>
    </StrictMode>
  );
}
