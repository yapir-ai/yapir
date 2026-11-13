import { isOrganizationAdmin } from "@server/lib/auth/access";
import { ProjectUpdateRequest } from "@server/lib/projects/project-update.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import {
  DeletedBadge,
  SoftDeleteZone,
  useSoftDelete,
} from "@web/components/soft-delete-controls";
import { FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { useSessionUser } from "@web/lib/auth/session";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { projectsCollection } from "@web/lib/projects/project.collection";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { repositoryOpenLink } from "@web/lib/repositories/repository-open-link";

const ProjectForm = ProjectUpdateRequest.required({
  name: true,
  instructions: true,
});

export const Route = createFileRoute("/projects/$projectId/settings")({
  staticData: {
    breadcrumb: "Settings",
    description:
      "Edit a project's name, its CI repository, and its instructions, which the agents of its automations receive. Project Admins edit them. Organization Admins delete and restore the project.",
  },
  component: ProjectSettingsPage,
});

function ProjectSettingsPage() {
  const { projectId } = Route.useParams();
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { data: project } = useLiveSuspenseQuery(projectInfoQuery(projectId));

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  if (!project) {
    throw notFound();
  }

  const isAdmin = isOrganizationAdmin(useSessionUser());
  const canWrite = useProjectAccess("write", projectId) && !project.deletedAt;
  const projects = dbClient.collection(projectsCollection);

  const { isPending, remove, restore } = useSoftDelete(
    projects,
    projectId,
    async () => await navigate({ to: "/projects" })
  );

  const form = useAppForm({
    validators: { onChange: ProjectForm },
    defaultValues: {
      name: project.name,
      ...(project.ciRepositoryId && { ciRepositoryId: project.ciRepositoryId }),
      instructions: project.instructions,
    },
    onSubmit: async ({ value, formApi }) => {
      await projects
        .update(projectId, (draft) => {
          Object.assign(draft, value);
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  return (
    <Page>
      <PageHeader
        title="Settings"
        badge={<DeletedBadge deletedAt={project.deletedAt} />}
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={!canWrite} className="grid">
            <FormSection title="General">
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" />}
              </form.AppField>
              {repositories.length > 0 && (
                <form.AppField name="ciRepositoryId">
                  {(field) => (
                    <field.SelectField
                      label="CI repository"
                      description="New automations run their executions in its CI."
                      placeholder="Select a repository"
                      openLink={repositoryOpenLink(
                        repositories,
                        field.state.value
                      )}
                      options={repositories.map(({ id, path }) => ({
                        value: id,
                        label: path,
                      }))}
                    />
                  )}
                </form.AppField>
              )}
            </FormSection>
            <FormSection
              title="Instructions"
              description="The agents of the project get them in each execution."
            >
              <form.AppField name="instructions">
                {(field) => (
                  <field.MarkdownField
                    label="Instructions"
                    readOnly={!canWrite}
                    className="min-h-64"
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {canWrite && <form.SaveBar>Save project</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="project"
        consequence="Yapir also deletes its automations, and a restore keeps them deleted."
        deletedAt={project.deletedAt}
        canWrite={isAdmin}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
