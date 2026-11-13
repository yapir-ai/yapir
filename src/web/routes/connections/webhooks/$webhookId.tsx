import { isOrganizationAdmin } from "@server/lib/auth/access";
import { WebhookInfoParams } from "@server/lib/webhooks/webhook-info.dto";
import { WebhookUpdateRequest } from "@server/lib/webhooks/webhook-update.dto";
import {
  WebhookDeliveryIdHeader,
  WebhookSecret,
} from "@server/lib/webhooks/webhook.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import {
  DeletedBadge,
  SoftDeleteZone,
  useSoftDelete,
} from "@web/components/soft-delete-controls";
import { Code } from "@web/components/ui/code";
import { FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { useSessionUser } from "@web/lib/auth/session";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import {
  updateWebhook,
  webhooksCollection,
} from "@web/lib/webhooks/webhook.collection";
import { webhookAuthOptions } from "@web/lib/webhooks/webhook.options";
import { webhookInfoQuery } from "@web/lib/webhooks/webhook.queries";
import { Webhook } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

export const Route = createFileRoute("/connections/webhooks/$webhookId")({
  params: { parse: (params) => WebhookInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    await context.dbClient.preloadLiveQuery(webhookInfoQuery(params.webhookId));
  },
  staticData: {
    breadcrumb: <WebhookBreadcrumb />,
    description:
      "Edit a webhook: its delivery URL to configure at the sending system, and how deliveries authenticate.",
  },
  component: WebhookInfoPage,
  notFoundComponent: () => (
    <Page>
      <PageHeader title="Webhook not found" />
    </Page>
  ),
});

const WebhookForm = WebhookUpdateRequest.required()
  .pick({ name: true, auth: true, headerName: true })
  .extend({
    prefix: z.string().trim(),
    deliveryIdHeader: WebhookDeliveryIdHeader.or(z.literal("")),
    secret: WebhookSecret.or(z.literal("")),
  });

function WebhookBreadcrumb(): ReactNode {
  const { webhookId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(webhookInfoQuery(webhookId));

  return <BreadcrumbLabel>{data?.name ?? "Webhook"}</BreadcrumbLabel>;
}

function WebhookInfoPage() {
  const { webhookId } = Route.useParams();

  return <WebhookEditor key={webhookId} webhookId={webhookId} />;
}

function WebhookEditor({ webhookId }: { webhookId: string }) {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const { data: webhook } = useLiveSuspenseQuery(webhookInfoQuery(webhookId));

  if (!webhook) {
    throw notFound({ routeId: Route.id });
  }

  const isAdmin = isOrganizationAdmin(useSessionUser());
  const webhooks = dbClient.collection(webhooksCollection);

  const { isPending, remove, restore } = useSoftDelete(
    webhooks,
    webhookId,
    async () => await navigate({ to: "/connections" })
  );

  const readOnly = isPending || !isAdmin || !!webhook.deletedAt;

  const form = useAppForm({
    validators: { onChange: WebhookForm },
    defaultValues: {
      name: webhook.name,
      auth: webhook.auth,
      headerName: webhook.headerName,
      prefix: webhook.prefix ?? "",
      deliveryIdHeader: webhook.deliveryIdHeader ?? "",
      secret: "",
    },
    onSubmit: async ({ value, formApi }) => {
      const { prefix, deliveryIdHeader, secret, ...settings } = value;
      await updateWebhook(dbClient, webhookId, {
        ...settings,
        prefix: prefix || null,
        deliveryIdHeader: deliveryIdHeader || null,
        secret: secret || undefined,
      });
      formApi.reset({ ...value, secret: "" });
    },
  });

  return (
    <Page>
      <PageHeader
        title={webhook.name}
        icon={<Webhook aria-hidden="true" />}
        badge={<DeletedBadge deletedAt={webhook.deletedAt} />}
        description={
          <>
            Configure the sending system to POST JSON to{" "}
            <Code>{`${window.location.origin}/api/webhooks/custom/${webhookId}`}</Code>
            . Each delivery starts its own task in the automations it triggers.
          </>
        }
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
            <FormSection title="General">
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" />}
              </form.AppField>
            </FormSection>
            <FormSection title="Authentication">
              <form.AppField name="auth">
                {(field) => (
                  <field.SelectField
                    label="Authentication"
                    options={webhookAuthOptions}
                  />
                )}
              </form.AppField>
              <form.AppField name="headerName">
                {(field) => <field.TextField label="Header" />}
              </form.AppField>
              <form.AppField name="secret">
                {(field) => (
                  <field.TextField
                    label="Secret"
                    type="password"
                    autoComplete="off"
                    placeholder="••••••••"
                    description="Leave empty to keep the current secret."
                  />
                )}
              </form.AppField>
              <form.AppField name="prefix">
                {(field) => (
                  <field.TextField
                    label="Signature prefix"
                    description="Optional, with an HMAC signature: what precedes the hex digest, such as sha256=."
                  />
                )}
              </form.AppField>
            </FormSection>
            <FormSection title="Deliveries">
              <form.AppField name="deliveryIdHeader">
                {(field) => (
                  <field.TextField
                    label="Delivery ID header"
                    description="Yapir ignores a delivery with a known ID."
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {!readOnly && <form.SaveBar>Save webhook</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <SoftDeleteZone
        resource="webhook"
        consequence="Yapir refuses its deliveries."
        deletedAt={webhook.deletedAt}
        canWrite={isAdmin}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
