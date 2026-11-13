import { isOrganizationAdmin } from "@server/lib/auth/access";
import { ModelProviderInfoParams } from "@server/lib/model-providers/model-provider-info.dto";
import { ModelProviderUpdateRequest } from "@server/lib/model-providers/model-provider-update.dto";
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
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";
import {
  modelProvidersCollection,
  updateModelProvider,
} from "@web/lib/model-providers/model-provider.collection";
import { modelProviderInfoQuery } from "@web/lib/model-providers/model-provider.queries";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import type { ReactNode } from "react";
import { z } from "zod";

export const Route = createFileRoute("/model-providers/$modelProviderId")({
  params: { parse: (params) => ModelProviderInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    await context.dbClient.preloadLiveQuery(
      modelProviderInfoQuery(params.modelProviderId)
    );
  },
  staticData: {
    breadcrumb: <ModelProviderBreadcrumb />,
    description: "Edit a model provider: endpoint and API key.",
  },
  component: ModelProviderInfoPage,
  notFoundComponent: () => (
    <Page>
      <PageHeader title="Model provider not found" />
    </Page>
  ),
});

const ModelProviderForm = ModelProviderUpdateRequest.required().extend({
  apiKey: ModelProviderUpdateRequest.shape.apiKey.unwrap().or(z.literal("")),
});

function ModelProviderBreadcrumb(): ReactNode {
  const { modelProviderId } = Route.useParams();

  const { data } = useLiveSuspenseQuery(
    modelProviderInfoQuery(modelProviderId)
  );

  return <BreadcrumbLabel>{data?.name ?? "Model provider"}</BreadcrumbLabel>;
}

function ModelProviderInfoPage() {
  const { modelProviderId } = Route.useParams();

  return (
    <ModelProviderEditor
      key={modelProviderId}
      modelProviderId={modelProviderId}
    />
  );
}

function ModelProviderEditor({ modelProviderId }: { modelProviderId: string }) {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const { data: modelProvider } = useLiveSuspenseQuery(
    modelProviderInfoQuery(modelProviderId)
  );

  if (!modelProvider) {
    throw notFound({ routeId: Route.id });
  }

  const isAdmin = isOrganizationAdmin(useSessionUser());
  const modelProviders = dbClient.collection(modelProvidersCollection);

  const { isPending, remove, restore } = useSoftDelete(
    modelProviders,
    modelProviderId,
    async () => await navigate({ to: "/model-providers" })
  );

  const readOnly = isPending || !isAdmin || !!modelProvider.deletedAt;

  const form = useAppForm({
    validators: { onChange: ModelProviderForm },
    defaultValues: {
      name: modelProvider.name,
      baseUrl: modelProvider.baseUrl,
      apiKey: "",
    },
    onSubmit: async ({ value: { apiKey, ...value }, formApi }) => {
      await updateModelProvider(dbClient, modelProviderId, {
        ...value,
        apiKey: apiKey || undefined,
      });
      formApi.reset({ ...value, apiKey: "" });
    },
  });

  return (
    <Page>
      <PageHeader
        title={modelProvider.name}
        icon={<ModelProviderIcon catalogId={modelProvider.catalogId} />}
        badge={<DeletedBadge deletedAt={modelProvider.deletedAt} />}
        description={modelProvider.catalogId}
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
            <FormSection title="General">
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
                    placeholder="••••••••"
                    description="Leave empty to keep the current key."
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {!readOnly && <form.SaveBar>Save model provider</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="model provider"
        consequence="Agents can no longer select it."
        deletedAt={modelProvider.deletedAt}
        canWrite={isAdmin}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
