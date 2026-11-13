import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@web/components/ui/sidebar";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import type { Project } from "@web/lib/projects/project.collection";
import { ChevronsUpDown, List } from "lucide-react";

export function ProjectSwitcher({
  project,
  recent,
}: {
  project: Project;
  recent: Project[];
}) {
  const { isMobile } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Switch project: ${project.name}`}
        render={<SidebarMenuButton tooltip={project.name} />}
      >
        <ProjectIcon project={project} />
        <span className="truncate">{project.name}</span>
        <ChevronsUpDown className="ml-auto" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        side={isMobile ? "bottom" : "right"}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Recent projects</DropdownMenuLabel>
          {recent.map((item) => (
            <DropdownMenuItem
              key={item.id}
              render={
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: item.id }}
                />
              }
            >
              <ProjectIcon project={item} />
              <span className="truncate">{item.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/projects" />}>
          <List />
          All projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
