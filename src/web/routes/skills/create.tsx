import { SkillCreateRequest } from "@server/lib/skills/skill-create.dto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { useSessionUser } from "@web/lib/auth/session";
import { skillsCollection } from "@web/lib/skills/skill.collection";
import { v7 as uuidv7 } from "uuid";

const SkillCreateForm = SkillCreateRequest.omit({ id: true });

export const Route = createFileRoute("/skills/create")({
  staticData: {
    breadcrumb: "Create",
    description: "Create a skill to share with the organization.",
  },
  component: SkillCreatePage,
});

function SkillCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const user = useSessionUser();

  const form = useAppForm({
    validators: { onChange: SkillCreateForm },
    defaultValues: { name: "", description: "", instructions: "" },
    onSubmit: async ({ value }) => {
      const id = uuidv7();
      await dbClient
        .collection(skillsCollection)
        .insert({ ...value, id, deletedAt: null, authorId: user.id })
        .when("settled");
      await navigate({ to: "/skills/$skillId", params: { skillId: id } });
    },
  });

  return (
    <Page>
      <PageHeader title="Create skill" />
      <form.AppForm>
        <form.Form>
          <FormSection title="General">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Name"
                  description="Lowercase letters, digits and hyphens, such as code-review."
                />
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label="Description"
                  multiline
                  description="What the skill does and when to use it."
                />
              )}
            </form.AppField>
          </FormSection>
          <FormSection title="Instructions" description="In Markdown.">
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
              <form.SubmitButton>Create skill</form.SubmitButton>
              <Link
                to="/skills"
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
