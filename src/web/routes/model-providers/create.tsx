import { ModelProviderCreateRequest } from "@server/lib/model-providers/model-provider-create.dto";
import type { ModelProviderCreateRequestDto } from "@server/lib/model-providers/model-provider-create.dto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { modelProvidersCollection } from "@web/lib/model-providers/model-provider.collection";
import { ProviderCatalogField } from "@web/lib/provider-catalog/provider-catalog-field";
import { providerCatalogListQuery } from "@web/lib/provider-catalog/provider-catalog.queries";
import { v7 as uuidv7 } from "uuid";

export const Route = createFileRoute("/model-providers/create")({
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(providerCatalogListQuery()),
  staticData: {
    breadcrumb: "Create",
    description: "Add a model provider from the provider catalog.",
  },
  component: ModelProviderCreatePage,
});

function ModelProviderCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const defaultValues: ModelProviderCreateRequestDto = {
    name: "",
    catalogId: "",
    baseUrl: "",
    apiKey: "",
  };

  const form = useAppForm({
    validators: { onChange: ModelProviderCreateRequest },
    defaultValues,
    onSubmit: async ({ value: { apiKey, ...value } }) => {
      const id = uuidv7();
      await dbClient
        .collection(modelProvidersCollection)
        .insert({ ...value, id, deletedAt: null }, { metadata: { apiKey } })
        .when("settled");
      await navigate({
        to: "/model-providers/$modelProviderId",
        params: { modelProviderId: id },
      });
    },
  });

  return (
    <Page>
      <PageHeader title="Add model provider" />
      <form.AppForm>
        <form.Form>
          <FormSection
            title="Provider"
            description="It fills the name and the base URL."
          >
            <form.AppField name="catalogId">
              {() => (
                <ProviderCatalogField
                  onSelect={(provider) => {
                    form.setFieldValue("baseUrl", provider.baseUrl ?? "");

                    if (!form.getFieldValue("name")) {
                      form.setFieldValue("name", provider.name);
                    }
                  }}
                />
              )}
            </form.AppField>
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" />}
            </form.AppField>
          </FormSection>
          <FormSection title="Endpoint">
            <form.AppField name="baseUrl">
              {(field) => <field.TextField label="Base URL" type="url" />}
            </form.AppField>
            <form.AppField name="apiKey">
              {(field) => (
                <field.TextField
                  label="API key"
                  type="password"
                  autoComplete="off"
                  description="Yapir does not show it again."
                />
              )}
            </form.AppField>
          </FormSection>
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Add model provider</form.SubmitButton>
              <Link
                to="/model-providers"
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
