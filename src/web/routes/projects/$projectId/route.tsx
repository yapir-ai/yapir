import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@web/components/ui/page";
import { projectMemberInfoQuery } from "@web/lib/project-members/project-member.queries";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { projectsCollection } from "@web/lib/projects/project.collection";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";

export const Route = createFileRoute("/projects/$projectId")({
  params: { parse: (params) => ProjectInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    const projects = context.dbClient.collection(projectsCollection);
    await projects.preload();

    if (!projects.has(params.projectId)) {
      notFound({ throw: true });
    }

    await Promise.all([
      context.dbClient.preloadLiveQuery(
        projectMemberInfoQuery(params.projectId, context.session.user.id)
      ),
      context.dbClient.preloadLiveQuery(
        projectRepositoryListQuery(params.projectId)
      ),
    ]);
  },
  staticData: { breadcrumb: <ProjectBreadcrumb /> },
  component: Outlet,
  notFoundComponent: () => <PageHeader title="Project not found" />,
});

function ProjectBreadcrumb() {
  const { projectId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(projectInfoQuery(projectId));

  return <BreadcrumbLabel>{data?.name ?? "Project"}</BreadcrumbLabel>;
}
