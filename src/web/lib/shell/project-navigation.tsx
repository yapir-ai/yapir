import { useLiveQuery } from "@tanstack/react-db";
import { useHotkeys } from "@tanstack/react-hotkeys";
import {
  Link,
  useMatchRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@web/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import { projectListQuery } from "@web/lib/projects/project.queries";

import { projectPages } from "./navigation";
import { NavigationGroup } from "./navigation-group";
import { ProjectSwitcher } from "./project-switcher";
import { useRecentProjectIds } from "./recent";

export function ProjectNavigation() {
  const { projectId: openProjectId } = useParams({ strict: false });
  const recentIds = useRecentProjectIds(openProjectId);
  const { data: projects } = useLiveQuery(projectListQuery("", true));
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  const [project, ...others] = recentIds.flatMap(
    (id) => projects.find((item) => item.id === id) ?? []
  );

  useHotkeys(
    projectPages.map(({ to, appHotkey }) => ({
      hotkey: appHotkey,
      callback: () => {
        if (project) {
          void navigate({ to, params: { projectId: project.id } });
        }
      },
    }))
  );

  if (!project) {
    return null;
  }

  const projectId = project.id;

  return (
    <NavigationGroup label="Project" active={!!openProjectId}>
      <nav aria-label="Project navigation">
        <SidebarMenu>
          <SidebarMenuItem>
            <ProjectSwitcher
              project={project}
              recent={[
                project,
                ...others.filter((item) => item.deletedAt === null),
              ]}
            />
            <SidebarMenuSub>
              {projectPages.map(
                ({ to, label, icon: Icon, fuzzy, appHotkey }) => (
                  <SidebarMenuSubItem key={to}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <SidebarMenuSubButton
                            isActive={
                              !!matchRoute({ to, params: { projectId }, fuzzy })
                            }
                            render={<Link to={to} params={{ projectId }} />}
                          />
                        }
                      >
                        <Icon />
                        <span>{label}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {label}
                        <Shortcut appHotkey={appHotkey} />
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuSubItem>
                )
              )}
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </nav>
    </NavigationGroup>
  );
}
