import { useHotkeys } from "@tanstack/react-hotkeys";
import {
  Link,
  Outlet,
  useMatches,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import { AppHeader } from "@web/components/ui/app-header";
import { Logo } from "@web/components/ui/logo";
import { Separator } from "@web/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@web/components/ui/sidebar";
import { TooltipProvider } from "@web/components/ui/tooltip";
import { Wordmark } from "@web/components/ui/wordmark";
import { useCurrentAssistantChat } from "@web/lib/assistant/assistant-chat";
import {
  AssistantDock,
  AssistantDockToggle,
  useOnAssistantPage,
} from "@web/lib/assistant/assistant-dock";
import { cn } from "cn";
import { useState } from "react";
import type { ReactElement } from "react";

import { AppBreadcrumbs } from "./app-breadcrumbs";
import { CommandPalette } from "./command-palette";
import { NavUser } from "./nav-user";
import { pageList, pages } from "./navigation";
import type { NavigationPage } from "./navigation";
import { NavigationGroup } from "./navigation-group";
import { ProjectNavigation } from "./project-navigation";
import { ReleaseNotice } from "./release-notice";
import { ShortcutsDialog } from "./shortcuts-dialog";

const libraryPages = [pages.agents, pages.skills];

const organizationPages = [
  pages.connections,
  pages.modelProviders,
  pages.defaults,
  pages.networkPolicy,
  pages.users,
];

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    sidebar?: ReactElement;
    // The page fills the area below the header, without padding.
    fullBleed?: boolean;
  }
}

export function AppLayout() {
  const routeSidebar = useMatches({
    select: (matches) =>
      matches.find(
        (match) => match.status !== "notFound" && match.staticData.sidebar
      )?.staticData.sidebar,
  });

  const fullBleed = useMatches({
    select: (matches) => matches.some((match) => match.staticData.fullBleed),
  });

  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const { startConversation, dockOpen } = useCurrentAssistantChat();
  const onAssistantPage = useOnAssistantPage();

  useHotkeys(
    pageList.map((page) => ({
      hotkey: page.appHotkey,
      callback: () => {
        void navigate({ to: page.to });
      },
    }))
  );
  const contextual = !!routeSidebar;
  const [open, setOpen] = useState(!contextual);
  const [prevContextual, setPrevContextual] = useState(contextual);

  if (contextual !== prevContextual) {
    setPrevContextual(contextual);
    setOpen(!contextual);
  }

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Sidebar variant="floating" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<Link to="/" />}>
                  <Logo />
                  <Wordmark />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <nav aria-label="General navigation">
              <SidebarGroup>
                <SidebarMenu>
                  <NavigationItem page={pages.home} />
                  <NavigationItem page={pages.projects} />
                  <NavigationItem page={pages.metrics} />
                  <NavigationItem
                    page={pages.assistant}
                    // On the new conversation page, which stays mounted, the link starts another one.
                    onClick={() => {
                      if (matchRoute({ to: "/assistant" })) {
                        startConversation();
                      }
                    }}
                  />
                </SidebarMenu>
              </SidebarGroup>
            </nav>
            <ProjectNavigation />
            <nav aria-label="Organization navigation">
              <NavigationPageGroup label="Library" pages={libraryPages} />
              <NavigationPageGroup
                label="Organization"
                pages={organizationPages}
              />
            </nav>
          </SidebarContent>
          <SidebarFooter>
            <ReleaseNotice />
            <NavUser />
          </SidebarFooter>
        </Sidebar>
        {routeSidebar && (
          <div className="sticky top-0 flex h-svh shrink-0 py-2 pr-2">
            <Sidebar variant="floating" collapsible="none">
              {routeSidebar}
            </Sidebar>
          </div>
        )}
        <SidebarInset className="min-w-0">
          <AppHeader>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <AppBreadcrumbs />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <CommandPalette />
              {!onAssistantPage && <AssistantDockToggle />}
            </div>
          </AppHeader>
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-4",
              !fullBleed && "p-4"
            )}
          >
            <Outlet />
          </div>
        </SidebarInset>
        {dockOpen && !onAssistantPage && <AssistantDock />}
      </SidebarProvider>
      <ShortcutsDialog />
    </TooltipProvider>
  );
}

function NavigationPageGroup({
  label,
  pages: groupPages,
}: {
  label: string;
  pages: NavigationPage[];
}) {
  const matchRoute = useMatchRoute();

  return (
    <NavigationGroup
      label={label}
      active={groupPages.some(({ to, fuzzy }) => !!matchRoute({ to, fuzzy }))}
    >
      <SidebarMenu>
        {groupPages.map((page) => (
          <NavigationItem key={page.to} page={page} />
        ))}
      </SidebarMenu>
    </NavigationGroup>
  );
}

function NavigationItem({
  page,
  onClick,
}: {
  page: NavigationPage;
  onClick?: () => void;
}) {
  const matchRoute = useMatchRoute();
  const { icon: Icon, label, to, fuzzy, appHotkey } = page;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={{
          children: (
            <>
              {label}
              <Shortcut appHotkey={appHotkey} />
            </>
          ),
        }}
        isActive={!!matchRoute({ to, fuzzy })}
        render={<Link to={to} onClick={onClick} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
