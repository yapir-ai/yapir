import { AgentInfoParams } from "@server/lib/agents/agent-info.dto";
import { AgentUpdateRequest } from "@server/lib/agents/agent-update.dto";
import { isOrganizationAdmin } from "@server/lib/auth/access";
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
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { AgentSkillsField } from "@web/lib/agents/agent-skills-field";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import {
  harnessDescription,
  harnessOptions,
} from "@web/lib/agents/agent.options";
import { agentInfoQuery } from "@web/lib/agents/agent.queries";
import { useSessionUser } from "@web/lib/auth/session";
import {
  automationCapabilitiesQuery,
  automationEventsQuery,
  deletedWebhooksQuery,
} from "@web/lib/automations/automation-catalog.queries";
import { AutomationConfigurationFields } from "@web/lib/automations/automation-configuration-fields";
import { AutomationTriggerForm } from "@web/lib/automations/automation.form";
import { MetricsSummary } from "@web/lib/metrics/metrics-summary";
import { modelProviderOpenLink } from "@web/lib/model-providers/model-provider-open-link";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { EffortField } from "@web/lib/provider-catalog/effort-field";
import { ModelField } from "@web/lib/provider-catalog/model-field";
import { providerCatalogListQuery } from "@web/lib/provider-catalog/provider-catalog.queries";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import { skillListQuery } from "@web/lib/skills/skill.queries";
import type { ReactNode } from "react";
import { z } from "zod";

const AgentForm = AgentUpdateRequest.required().extend({
  description: z.string().trim(),
  triggers: z.array(AutomationTriggerForm),
});

export const Route = createFileRoute("/agents/$agentId")({
  params: { parse: (params) => AgentInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.dbClient.preloadLiveQuery(agentInfoQuery(params.agentId)),
      context.dbClient.preloadLiveQuery(modelProviderListQuery("", true)),
      context.dbClient.preloadLiveQuery(providerCatalogListQuery()),
      context.dbClient.preloadLiveQuery(skillListQuery("", true)),
      context.dbClient.preloadLiveQuery(automationEventsQuery),
      context.dbClient.preloadLiveQuery(deletedWebhooksQuery),
      context.dbClient.preloadLiveQuery(automationCapabilitiesQuery),
    ]);
  },
  staticData: {
    breadcrumb: <AgentBreadcrumb />,
    description:
      "Edit an agent: instructions, skills, harness, model provider, model, effort, and the default triggers and capabilities of its automations. Above the form, the metrics of its last 30 days.",
  },
  component: AgentInfoPage,
  notFoundComponent: () => (
    <Page>
      <PageHeader title="Agent not found" />
    </Page>
  ),
});

function AgentBreadcrumb(): ReactNode {
  const { agentId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(agentInfoQuery(agentId));

  return <BreadcrumbLabel>{data?.name ?? "Agent"}</BreadcrumbLabel>;
}

function AgentInfoPage() {
  const { agentId } = Route.useParams();

  return <AgentEditor key={agentId} agentId={agentId} />;
}

function AgentEditor({ agentId }: { agentId: string }) {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { data: agent } = useLiveSuspenseQuery(agentInfoQuery(agentId));

  if (!agent) {
    throw notFound({ routeId: Route.id });
  }

  const isAdmin = isOrganizationAdmin(useSessionUser());
  const agents = dbClient.collection(agentsCollection);

  const { isPending, remove, restore } = useSoftDelete(
    agents,
    agentId,
    async () => await navigate({ to: "/agents" })
  );

  const readOnly = isPending || !isAdmin || !!agent.deletedAt;

  const form = useAppForm({
    validators: { onChange: AgentForm },
    defaultValues: {
      name: agent.name,
      description: agent.description ?? "",
      modelProviderId: agent.modelProviderId,
      model: agent.model,
      effort: agent.effort,
      harness: agent.harness,
      prompt: agent.prompt,
      skillIds: agent.skillIds,
      triggers: agent.triggers,
      capabilities: agent.capabilities,
    },
    onSubmit: async ({ value, formApi }) => {
      await agents
        .update(agentId, (draft) => {
          Object.assign(draft, {
            ...value,
            description: value.description.trim() || null,
          });
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  const { modelProviderId, model, harness } = useSelector(
    form.store,
    (state) => state.values
  );

  const { data: modelProviders } = useLiveSuspenseQuery(
    modelProviderListQuery("", true)
  );

  const { data: events } = useLiveSuspenseQuery(automationEventsQuery);

  const { data: capabilities } = useLiveSuspenseQuery(
    automationCapabilitiesQuery
  );

  return (
    <Page>
      <PageHeader
        title={agent.name}
        icon={<AgentIcon agent={agent} />}
        badge={<DeletedBadge deletedAt={agent.deletedAt} />}
      />
      <MetricsSummary filters={{ agentId }} />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
            <FormSection title="General">
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" />}
              </form.AppField>
              <form.AppField name="description">
                {(field) => (
                  <field.TextField
                    label="Description"
                    description="Optional: what the agent does, in one sentence."
                  />
                )}
              </form.AppField>
            </FormSection>
            <FormSection title="Model">
              <div className="grid gap-6 md:grid-cols-2">
                <form.AppField name="harness">
                  {(field) => (
                    <field.SelectField
                      label="Harness"
                      description={harnessDescription}
                      options={harnessOptions}
                    />
                  )}
                </form.AppField>
                <form.AppField name="modelProviderId">
                  {(field) => (
                    <field.SelectField
                      label="Model provider"
                      placeholder="Select a model provider"
                      openLink={modelProviderOpenLink(field.state.value)}
                      options={modelProviders
                        .filter(
                          ({ id, deletedAt }) =>
                            deletedAt === null || id === modelProviderId
                        )
                        .map(({ id, name }) => ({ value: id, label: name }))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="model">
                  {() => (
                    <ModelField
                      modelProviderId={modelProviderId}
                      harness={harness}
                    />
                  )}
                </form.AppField>
                <form.AppField name="effort">
                  {() => (
                    <EffortField
                      modelProviderId={modelProviderId}
                      model={model}
                    />
                  )}
                </form.AppField>
              </div>
            </FormSection>
            <FormSection
              title="Instructions"
              description="The agent gets them in each execution."
            >
              <form.AppField name="prompt">
                {(field) => (
                  <field.TextField
                    label="Instructions"
                    multiline
                    className="min-h-64"
                  />
                )}
              </form.AppField>
            </FormSection>
            <FormSection title="Skills">
              <form.AppField name="skillIds">
                {() => <AgentSkillsField />}
              </form.AppField>
            </FormSection>
            <AutomationConfigurationFields
              form={form}
              fields={{ triggers: "triggers", capabilities: "capabilities" }}
              title={agent.name}
              events={events}
              capabilities={capabilities}
              readOnly={readOnly}
              hideUnknownTriggers
            />
          </fieldset>
          {!readOnly && <form.SaveBar>Save agent</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="agent"
        consequence="Automations can no longer select it."
        deletedAt={agent.deletedAt}
        canWrite={isAdmin}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
