import { AgentCreateRequest } from "@server/lib/agents/agent-create.dto";
import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { AgentSkillsField } from "@web/lib/agents/agent-skills-field";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import {
  harnessDescription,
  harnessOptions,
} from "@web/lib/agents/agent.options";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { modelProviderOpenLink } from "@web/lib/model-providers/model-provider-open-link";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { EffortField } from "@web/lib/provider-catalog/effort-field";
import { ModelField } from "@web/lib/provider-catalog/model-field";
import { providerCatalogListQuery } from "@web/lib/provider-catalog/provider-catalog.queries";
import { skillListQuery } from "@web/lib/skills/skill.queries";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

export const Route = createFileRoute("/agents/create")({
  loader: async ({ context }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(modelProviderListQuery()),
      context.dbClient.preloadLiveQuery(providerCatalogListQuery()),
      context.dbClient.preloadLiveQuery(defaultsQuery()),
      context.dbClient.preloadLiveQuery(skillListQuery("", true)),
    ]),
  staticData: {
    breadcrumb: "Create",
    description: "Create an agent.",
  },
  component: AgentCreatePage,
});

const CreateForm = AgentCreateRequest.extend({
  description: z.string().trim(),
});

function AgentCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { data: defaults } = useLiveSuspenseQuery(defaultsQuery());

  const defaultValues: z.input<typeof CreateForm> = {
    name: "",
    description: "",
    modelProviderId: defaults?.modelProviderId ?? "",
    model: defaults?.model ?? "",
    effort: defaults?.effort ?? null,
    harness: defaults?.harness ?? HarnessNameSchema.enum.OpenCode,
    prompt: "",
    skillIds: [],
  };

  const form = useAppForm({
    validators: { onChange: CreateForm },
    defaultValues,
    onSubmit: async ({ value: { description, ...value } }) => {
      const id = uuidv7();
      await dbClient
        .collection(agentsCollection)
        .insert({
          effort: null,
          skillIds: [],
          triggers: [],
          capabilities: [],
          ...value,
          description: description.trim() || null,
          id,
          deletedAt: null,
        })
        .when("settled");
      await navigate({ to: "/agents/$agentId", params: { agentId: id } });
    },
  });

  const { data: modelProviders } = useLiveSuspenseQuery(
    modelProviderListQuery()
  );

  const { modelProviderId, model, harness } = useSelector(
    form.store,
    (state) => state.values
  );

  return (
    <Page>
      <PageHeader title="Create agent" />
      <form.AppForm>
        <form.Form>
          <FormSection
            title="General"
            description="Add the default triggers and capabilities of its automations after you create it."
          >
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
                    options={modelProviders.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    }))}
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
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Create agent</form.SubmitButton>
              <Link
                to="/agents"
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
