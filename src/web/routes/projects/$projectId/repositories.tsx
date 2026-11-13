import { isOrganizationAdmin } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { ListPagination } from "@web/components/list-controls";
import { Button } from "@web/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page, PageHeader } from "@web/components/ui/page";
import { ProviderIcon } from "@web/components/ui/provider-icon";
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
import { toastFailure } from "@web/lib/errors";
import {
  listPage,
  listRouteSearch,
  ListRouteSearch,
} from "@web/lib/lists/list.route";
import { ProjectRepositoryPicker } from "@web/lib/project-repositories/project-repository-picker";
import { projectRepositoriesCollection } from "@web/lib/project-repositories/project-repository.collection";
import {
  projectNonRepositoryListQuery,
  projectRepositoryListQuery,
} from "@web/lib/project-repositories/project-repository.queries";
import { repositoryUrl } from "@web/lib/repositories/repository-url";
import { FolderGit2 } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/repositories")({
  ...listRouteSearch(ListRouteSearch.pick({ offset: true })),
  loader: async ({ context, params }) =>
    await context.dbClient.preloadLiveQuery(
      projectNonRepositoryListQuery(params.projectId)
    ),
  staticData: {
    breadcrumb: "Repositories",
    description:
      "Repositories of a project: its automations work on all of them. Organization Admins add and remove them.",
  },
  component: RepositoriesPage,
});

function RepositoriesPage() {
  const { projectId } = Route.useParams();
  const { dbClient } = Route.useRouteContext();
  const isAdmin = isOrganizationAdmin(useSessionUser());

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  const { offset } = Route.useSearch();
  const page = listPage(repositories, offset);

  const links = dbClient.collection(projectRepositoriesCollection(projectId));

  return (
    <Page width="wide">
      <PageHeader
        title="Repositories"
        description="The automations of this project work on all its repositories. The repositories of a project share one Git host."
      >
        {isAdmin && (
          <ProjectRepositoryPicker
            projectId={projectId}
            onSelect={(repositoryId) => {
              void toastFailure(links.insert({ projectId, repositoryId }));
            }}
          />
        )}
      </PageHeader>
      {repositories.length === 0 ? (
        <Empty variant="outline">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No repositories yet</EmptyTitle>
            <EmptyDescription>
              The automations of this project work on its repositories.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>Git host</TableHead>
              {isAdmin && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((repository) => (
              <TableRow key={repository.id}>
                <TableCell grow>
                  <span className="flex items-center gap-2">
                    <ProviderIcon provider={repository.provider} />
                    <TableRowLink
                      to={repositoryUrl(repository)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {repository.path}
                    </TableRowLink>
                  </span>
                </TableCell>
                <TableCell variant="muted">{repository.host}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void toastFailure(links.delete(repository.id));
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={page.length}
        total={repositories.length}
        noun={["repository", "repositories"]}
      />
    </Page>
  );
}
