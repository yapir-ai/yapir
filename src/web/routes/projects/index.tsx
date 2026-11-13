import { isOrganizationAdmin } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { CreateLink } from "@web/components/create-link";
import {
  ListNoResults,
  ListPagination,
  ListSearch,
  ListToolbar,
  ShowDeletedFilter,
} from "@web/components/list-controls";
import { DeletedBadge } from "@web/components/soft-delete-controls";
import { buttonVariants } from "@web/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowLink,
} from "@web/components/ui/table";
import { useSessionUser } from "@web/lib/auth/session";
import {
  listPage,
  searchFilters,
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import {
  ProjectLastExecution,
  ProjectRepositoriesSummary,
} from "@web/lib/projects/project-summary";
import { projectListQuery } from "@web/lib/projects/project.queries";
import { FolderGit2 } from "lucide-react";

export const Route = createFileRoute("/projects/")({
  ...listRouteSearch(SoftDeleteListRouteSearch),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, deps }) =>
    await context.dbClient.preloadLiveQuery(
      projectListQuery("", deps.showDeleted)
    ),
  staticData: { description: "Projects the user can access." },
  component: ProjectsPage,
});

function ProjectsPage() {
  const { search, offset, showDeleted } = Route.useSearch();
  const { data } = useLiveSuspenseQuery(projectListQuery(search, showDeleted));
  const isAdmin = isOrganizationAdmin(useSessionUser());
  const projects = listPage(data, offset);

  const emptyState = search ? (
    <ListNoResults noun="projects" filters={searchFilters(search)} />
  ) : (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderGit2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          A project groups the repositories that its automations work on.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Page width="wide">
      <PageHeader
        title="Projects"
        description="A project groups repositories, with their automations, members and instructions."
      >
        {isAdmin && (
          <CreateLink to="/projects/create" className={buttonVariants()}>
            Create project
          </CreateLink>
        )}
      </PageHeader>
      <ListToolbar>
        <ListSearch label="Search projects" value={search} />
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      {projects.length === 0 ? (
        emptyState
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Repositories</TableHead>
              <TableHead>Last execution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell grow>
                  <span className="flex items-center gap-2">
                    <ProjectIcon project={project} size="xs" />
                    <TableRowLink
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                    >
                      {project.name}
                    </TableRowLink>
                    <DeletedBadge deletedAt={project.deletedAt} />
                  </span>
                </TableCell>
                <TableCell variant="muted">
                  <ProjectRepositoriesSummary projectId={project.id} />
                </TableCell>
                <TableCell variant="muted">
                  <ProjectLastExecution projectId={project.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={projects.length}
        total={data.length}
        noun={["project", "projects"]}
      />
    </Page>
  );
}
