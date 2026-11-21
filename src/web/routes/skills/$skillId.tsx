import { canWriteSkill } from "@server/lib/auth/access";
import { SkillFormSchema, SkillParams } from "@server/lib/skills/skill.api";
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
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import { SkillInstallButton } from "@web/lib/skills/skill-install-button";
import { skillsCollection } from "@web/lib/skills/skill.collection";
import { skillInfoQuery } from "@web/lib/skills/skill.queries";
import { Schema } from "effect";
import type { ReactNode } from "react";

const SkillForm = Schema.toStandardSchemaV1(SkillFormSchema);

export const Route = createFileRoute("/skills/$skillId")({
  params: { parse: Schema.decodeUnknownSync(SkillParams) },
  loader: async ({ context, params }) =>
    await context.dbClient.preloadLiveQuery(skillInfoQuery(params.skillId)),
  staticData: {
    breadcrumb: <SkillBreadcrumb />,
    description:
      "Read a skill and copy its install prompt. Its author and Organization Admins edit it.",
  },
  remountDeps: ({ params }) => params.skillId,
  component: SkillInfoPage,
  notFoundComponent: () => (
    <Page>
      <PageHeader title="Skill not found" />
    </Page>
  ),
});

function SkillBreadcrumb(): ReactNode {
  const { skillId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(skillInfoQuery(skillId));

  return <BreadcrumbLabel>{data?.name ?? "Skill"}</BreadcrumbLabel>;
}

function SkillInfoPage() {
  const { skillId } = Route.useParams();
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { data: skill } = useLiveSuspenseQuery(skillInfoQuery(skillId));
  const user = useSessionUser();

  if (!skill) {
    throw notFound({ routeId: Route.id });
  }

  const canWrite = canWriteSkill(user, skill);
  const skills = dbClient.collection(skillsCollection);

  const { isPending, remove, restore } = useSoftDelete(
    skills,
    skillId,
    async () => await navigate({ to: "/skills" })
  );

  const readOnly = !canWrite || isPending || !!skill.deletedAt;

  const form = useAppForm({
    validators: { onChange: SkillForm },
    defaultValues: {
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
    },
    onSubmit: async ({ value, formApi }) => {
      await skills
        .update(skillId, (draft) => {
          Object.assign(draft, value);
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  return (
    <Page>
      <PageHeader
        title={skill.name}
        badge={<DeletedBadge deletedAt={skill.deletedAt} />}
      >
        <SkillInstallButton skill={skill} />
      </PageHeader>
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
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
                    readOnly={readOnly}
                    className="min-h-64"
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {!readOnly && <form.SaveBar>Save skill</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="skill"
        consequence="Users can no longer find it."
        deletedAt={skill.deletedAt}
        canWrite={canWrite}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
