import { isOrganizationAdmin } from "@server/lib/auth/access";
import { DefaultsUpdateRequest } from "@server/lib/defaults/defaults-update.dto";
import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useAppForm } from "@web/components/form/app-form";
import { FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  harnessDescription,
  harnessOptions,
} from "@web/lib/agents/agent.options";
import { useSessionUser } from "@web/lib/auth/session";
import {
  defaultsCollection,
  defaultsKey,
} from "@web/lib/defaults/defaults.collection";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { modelProviderOpenLink } from "@web/lib/model-providers/model-provider-open-link";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { EffortField } from "@web/lib/provider-catalog/effort-field";
import { ModelField } from "@web/lib/provider-catalog/model-field";
import {
  modelProviderCatalogQuery,
  providerCatalogListQuery,
} from "@web/lib/provider-catalog/provider-catalog.queries";

const DefaultsForm = DefaultsUpdateRequest.required();

export const Route = createFileRoute("/defaults")({
  loader: async ({ context }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(defaultsQuery()),
      context.dbClient.preloadLiveQuery(modelProviderListQuery()),
      context.dbClient.preloadLiveQuery(providerCatalogListQuery()),
    ]),
  staticData: {
    breadcrumb: "Defaults",
    description:
      "The organization's defaults: the model the Assistant answers with, and the model and harness new agents start with.",
  },
  component: DefaultsPage,
});

function DefaultsPage() {
  const { dbClient } = Route.useRouteContext();
  const { data: defaults } = useLiveSuspenseQuery(defaultsQuery());
  const isAdmin = isOrganizationAdmin(useSessionUser());

  const form = useAppForm({
    validators: { onChange: DefaultsForm },
    defaultValues: {
      modelProviderId: defaults?.modelProviderId ?? "",
      model: defaults?.model ?? "",
      effort: defaults?.effort ?? null,
      harness: defaults?.harness ?? HarnessNameSchema.enum.OpenCode,
    },
    onSubmit: async ({ value, formApi }) => {
      await dbClient
        .collection(defaultsCollection)
        .update(defaultsKey, (draft) => {
          Object.assign(draft, value);
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  const values = useSelector(form.store, (state) => state.values);

  const { data: modelProviders } = useLiveSuspenseQuery(
    modelProviderListQuery()
  );

  const { data: catalog } = useLiveSuspenseQuery(
    modelProviderCatalogQuery(values.modelProviderId)
  );

  const assistantDrives = (model: string) =>
    (
      catalog?.provider.models.find(({ id }) => id === model) ??
      catalog?.provider
    )?.assistant ?? false;

  return (
    <Page>
      <PageHeader
        title="Defaults"
        description="What the Assistant answers with, and what new agents start with."
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={!isAdmin} className="grid">
            <FormSection
              title="Model"
              description="The Assistant and new agents use this model."
            >
              <form.AppField
                name="modelProviderId"
                listeners={{
                  onChange: () => form.setFieldValue("model", ""),
                }}
              >
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
              <div className="grid gap-6 md:grid-cols-2">
                <form.AppField
                  name="model"
                  validators={{
                    onChange: ({ value }) =>
                      assistantDrives(value)
                        ? undefined
                        : { message: "The Assistant cannot drive this model" },
                  }}
                >
                  {() => (
                    <ModelField
                      modelProviderId={values.modelProviderId}
                      harness={values.harness}
                      assistant
                    />
                  )}
                </form.AppField>
                <form.AppField name="effort">
                  {() => (
                    <EffortField
                      modelProviderId={values.modelProviderId}
                      model={values.model}
                    />
                  )}
                </form.AppField>
              </div>
            </FormSection>
            <FormSection title="Harness">
              <form.AppField name="harness">
                {(field) => (
                  <field.SelectField
                    label="Harness"
                    description={harnessDescription}
                    options={harnessOptions}
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {isAdmin && <form.SaveBar>Save defaults</form.SaveBar>}
        </form.Form>
      </form.AppForm>
    </Page>
  );
}
