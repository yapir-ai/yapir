import { WebhookCreateRequest } from "@server/lib/webhooks/webhook-create.dto";
import { WebhookDeliveryIdHeader } from "@server/lib/webhooks/webhook.dto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { webhooksCollection } from "@web/lib/webhooks/webhook.collection";
import { webhookAuthOptions } from "@web/lib/webhooks/webhook.options";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

export const Route = createFileRoute("/connections/webhooks/create")({
  staticData: {
    breadcrumb: "Add webhook",
    description:
      "Add a webhook: a system delivers notifications to its URL, which trigger automations.",
  },
  component: WebhookCreatePage,
});

const CreateForm = WebhookCreateRequest.extend({
  prefix: z.string().trim(),
  deliveryIdHeader: WebhookDeliveryIdHeader.or(z.literal("")),
});

function WebhookCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const defaultValues: z.input<typeof CreateForm> = {
    name: "",
    auth: "hmac",
    headerName: "",
    secret: "",
    prefix: "",
    deliveryIdHeader: "",
  };

  const form = useAppForm({
    validators: { onChange: CreateForm },
    defaultValues,
    onSubmit: async ({
      value: { secret, prefix, deliveryIdHeader, ...value },
    }) => {
      const id = uuidv7();
      await dbClient
        .collection(webhooksCollection)
        .insert(
          {
            ...value,
            id,
            deletedAt: null,
            prefix: prefix || null,
            deliveryIdHeader: deliveryIdHeader || null,
          },
          { metadata: { secret } }
        )
        .when("settled");
      await navigate({
        to: "/connections/webhooks/$webhookId",
        params: { webhookId: id },
      });
    },
  });

  return (
    <Page>
      <PageHeader title="Add webhook" />
      <form.AppForm>
        <form.Form>
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
              {(field) => (
                <field.TextField
                  label="Header"
                  description="The header carrying the secret or the signature, such as X-Hub-Signature-256."
                />
              )}
            </form.AppField>
            <form.AppField name="secret">
              {(field) => (
                <field.TextField
                  label="Secret"
                  type="password"
                  autoComplete="off"
                  description="The secret configured at the sending system."
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
                  description="Yapir ignores a delivery with a known ID, such as X-GitHub-Delivery."
                />
              )}
            </form.AppField>
          </FormSection>
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Add webhook</form.SubmitButton>
              <Link
                to="/connections"
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
