import { AutomationInfoRequest } from "@server/lib/automations/automation-info.dto";
import { fitsProject } from "@server/lib/git/repository-provider";
import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useAppForm } from "@web/components/form/app-form";
import {
  DeletedBadge,
  SoftDeleteZone,
  useSoftDelete,
} from "@web/components/soft-delete-controls";
import { FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { AutomationAgentField } from "@web/lib/automations/automation-agent-field";
import {
  automationCapabilitiesQuery,
  automationDispatchersQuery,
  automationEventsQuery,
  deletedWebhooksQuery,
} from "@web/lib/automations/automation-catalog.queries";
import { AutomationConfigurationFields } from "@web/lib/automations/automation-configuration-fields";
import { AutomationHeaderActions } from "@web/lib/automations/automation-header-actions";
import { automationsCollection } from "@web/lib/automations/automation.collection";
import { AutomationUpdateForm } from "@web/lib/automations/automation.form";
import { automationInfoQuery } from "@web/lib/automations/automation.queries";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { repositoryOpenLink } from "@web/lib/repositories/repository-open-link";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";

const projectAutomationParams = ProjectInfoParams.extend(
  AutomationInfoRequest.shape
);

export const Route = createFileRoute(
  "/projects/$projectId/automations/$automationId"
)({
  params: { parse: (params) => projectAutomationParams.parse(params) },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.dbClient.preloadLiveQuery(agentListQuery("", true)),
      context.dbClient.preloadLiveQuery(
        automationInfoQuery(params.projectId, params.automationId)
      ),
      context.dbClient.preloadLiveQuery(automationEventsQuery),
      context.dbClient.preloadLiveQuery(deletedWebhooksQuery),
      context.dbClient.preloadLiveQuery(automationCapabilitiesQuery),
      context.dbClient.preloadLiveQuery(automationDispatchersQuery),
    ]);
  },
  staticData: {
    breadcrumb: <AutomationBreadcrumb />,
    description:
      "Edit an automation: agent, triggers, capabilities, enabled state; run it manually.",
  },
  remountDeps: ({ params }) => params.automationId,
  component: AutomationInfoPage,
  notFoundComponent: () => <PageHeader title="Automation not found" />,
});

function AutomationBreadcrumb() {
  const { projectId, automationId } = Route.useParams();

  const { data } = useLiveSuspenseQuery(
    automationInfoQuery(projectId, automationId)
  );

  return <BreadcrumbLabel>{data?.name ?? "Automation"}</BreadcrumbLabel>;
}

function AutomationInfoPage() {
  const { projectId, automationId } = Route.useParams();
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const { data: automation } = useLiveSuspenseQuery(
    automationInfoQuery(projectId, automationId)
  );

  const { data: events } = useLiveSuspenseQuery(automationEventsQuery);

  const { data: capabilities } = useLiveSuspenseQuery(
    automationCapabilitiesQuery
  );

  const { data: dispatchers } = useLiveSuspenseQuery(
    automationDispatchersQuery
  );

  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  const project = { repositories };

  const automations = dbClient.collection(automationsCollection(projectId));

  const { isPending, remove, restore } = useSoftDelete(
    automations,
    automationId,
    async () =>
      await navigate({
        to: "/projects/$projectId/automations",
        params: { projectId },
      }),
    { serverChangesOnDelete: { enabled: false } }
  );

  const canWrite = useProjectAccess("write", projectId);

  if (!automation) {
    throw notFound({ routeId: Route.id });
  }

  const readOnly = !canWrite || isPending || !!automation.deletedAt;

  const projectDispatchers = dispatchers.filter((dispatcher) =>
    fitsProject(dispatcher, project)
  );

  const dispatcherOptions = projectDispatchers.map(({ name, label }) => ({
    value: name,
    label,
  }));

  const ciRepositoryOptions = repositories.map(({ id, path }) => ({
    value: id,
    label: path,
  }));

  const form = useAppForm({
    defaultValues: {
      name: automation.name,
      agentId: automation.agentId,
      triggers: automation.triggers,
      capabilities: automation.capabilities,
      dispatcher: automation.dispatcher,
      ciRepositoryId: automation.ciRepositoryId,
    },
    validators: { onChange: AutomationUpdateForm },
    onSubmit: async ({ value, formApi }) => {
      await automations
        .update(automationId, (draft) => {
          Object.assign(draft, value);
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  const isDirty = useSelector(form.store, (state) => !state.isDefaultValue);

  const runsInCi = useSelector(form.store, (state) =>
    projectDispatchers.some(
      ({ name, gitHost }) =>
        name === state.values.dispatcher && gitHost !== undefined
    )
  );

  return (
    <Page>
      <PageHeader
        title={automation.name}
        badge={<DeletedBadge deletedAt={automation.deletedAt} />}
      >
        <AutomationHeaderActions
          automation={automation}
          canWrite={!readOnly}
          isDirty={isDirty}
        />
      </PageHeader>
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
            <FormSection title="General">
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" />}
              </form.AppField>
              <form.AppField name="agentId">
                {() => <AutomationAgentField />}
              </form.AppField>
            </FormSection>
            <FormSection
              title="Execution environment"
              description="The CI of a repository of the project."
            >
              <form.AppField name="dispatcher">
                {(field) => (
                  <field.SelectField
                    label="Execution environment"
                    options={dispatcherOptions}
                  />
                )}
              </form.AppField>
              {runsInCi && (
                <form.AppField name="ciRepositoryId">
                  {(field) => (
                    <field.SelectField
                      label="CI repository"
                      description="The repository of the project whose CI runs the executions."
                      options={ciRepositoryOptions}
                      placeholder="Select a repository"
                      openLink={repositoryOpenLink(
                        repositories,
                        field.state.value
                      )}
                    />
                  )}
                </form.AppField>
              )}
            </FormSection>
            <AutomationConfigurationFields
              form={form}
              fields={{ triggers: "triggers", capabilities: "capabilities" }}
              title={automation.name}
              events={events.filter((event) => fitsProject(event, project))}
              capabilities={capabilities.filter((capability) =>
                fitsProject(capability, project)
              )}
              readOnly={readOnly}
            />
          </fieldset>
          {!readOnly && <form.SaveBar>Save automation</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="automation"
        consequence="Events no longer activate its agent."
        deletedAt={automation.deletedAt}
        canWrite={canWrite}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
