import { ProjectCreateRequest } from "@server/lib/projects/project-create.dto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { projectsCollection } from "@web/lib/projects/project.collection";
import { v7 as uuidv7 } from "uuid";

const ProjectCreateForm = ProjectCreateRequest.omit({ id: true }).required();

export const Route = createFileRoute("/projects/create")({
  staticData: {
    breadcrumb: "Create",
    description: "Create a project. Only Organization Admins create projects.",
  },
  component: ProjectCreatePage,
});

function ProjectCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const form = useAppForm({
    validators: { onChange: ProjectCreateForm },
    defaultValues: { name: "", instructions: "" },
    onSubmit: async ({ value }) => {
      const id = uuidv7();
      await dbClient
        .collection(projectsCollection)
        .insert({ ...value, id, deletedAt: null, ciRepositoryId: null })
        .when("settled");
      await navigate({
        to: "/projects/$projectId/repositories",
        params: { projectId: id },
      });
    },
  });

  return (
    <Page>
      <PageHeader title="Create project" />
      <form.AppForm>
        <form.Form>
          <FormSection title="General">
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" />}
            </form.AppField>
          </FormSection>
          <FormSection
            title="Instructions"
            description="The agents of the project get them in each execution."
          >
            <form.AppField name="instructions">
              {(field) => (
                <field.MarkdownField
                  label="Instructions"
                  className="min-h-64"
                />
              )}
            </form.AppField>
          </FormSection>
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Create project</form.SubmitButton>
              <Link
                to="/projects"
                className={buttonVariants({ variant: "outline" })}
              >
                Cancel
              </Link>
            </div>
          </FormFooter>
        </form.Form>
      </form.AppForm>
    </Page>
  );
}
