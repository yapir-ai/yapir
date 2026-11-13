import { AutomationCreateRequest } from "@server/lib/automations/automation-create.dto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { AutomationAgentField } from "@web/lib/automations/automation-agent-field";
import { automationDispatchersQuery } from "@web/lib/automations/automation-catalog.queries";
import { useAutomationInsert } from "@web/lib/automations/use-automation-insert";

export const Route = createFileRoute("/projects/$projectId/automations/create")(
  {
    loader: async ({ context }) => {
      await Promise.all([
        context.dbClient.preloadLiveQuery(agentListQuery("", true)),
        context.dbClient.preloadLiveQuery(automationDispatchersQuery),
      ]);
    },
    staticData: {
      breadcrumb: "Create",
      description: "Create an automation in a project.",
    },
    component: AutomationCreatePage,
  }
);

function AutomationCreatePage() {
  const { projectId } = Route.useParams();
  const navigate = Route.useNavigate();
  const insertAutomation = useAutomationInsert(projectId);

  const form = useAppForm({
    defaultValues: { name: "", agentId: "", projectId },
    validators: { onChange: AutomationCreateRequest },
    onSubmit: async ({ value }) => {
      const automationId = await insertAutomation(value);
      await navigate({
        to: "/projects/$projectId/automations/$automationId",
        params: { projectId, automationId },
      });
    },
  });

  return (
    <Page>
      <PageHeader title="Create automation" />
      <form.AppForm>
        <form.Form>
          <FormSection
            title="General"
            description="It starts with the default triggers and capabilities of its agent that the project can use."
          >
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" />}
            </form.AppField>
            <form.AppField name="agentId">
              {() => <AutomationAgentField />}
            </form.AppField>
          </FormSection>
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Create automation</form.SubmitButton>
              <Link
                to="/projects/$projectId/automations"
                params={{ projectId }}
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
