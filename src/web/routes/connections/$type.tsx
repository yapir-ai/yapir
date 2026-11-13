import { isOrganizationAdmin } from "@server/lib/auth/access";
import { ConnectionInfoParams } from "@server/lib/connections/connection-info.dto";
import {
  connectionDefinitions,
  connectionFields,
} from "@server/lib/connections/connection.dto";
import type {
  ConnectionResponseDto,
  ConnectionType,
} from "@server/lib/connections/connection.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { Markdown } from "@web/components/markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@web/components/ui/alert-dialog";
import { Button } from "@web/components/ui/button";
import { DangerZone, DangerZoneItem } from "@web/components/ui/danger-zone";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { ProviderIcon } from "@web/components/ui/provider-icon";
import { useSessionUser } from "@web/lib/auth/session";
import { ConnectionStatus } from "@web/lib/connections/connection-status";
import {
  connectionsCollection,
  syncGitlab,
  updateConnection,
} from "@web/lib/connections/connection.collection";
import {
  connectionFormFields,
  connectionLabels,
} from "@web/lib/connections/connection.presentation";
import { connectionInfoQuery } from "@web/lib/connections/connection.queries";
import { loadContent } from "@web/lib/content/content";
import { errorDetail, toastFailure } from "@web/lib/errors";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/connections/$type")({
  params: { parse: (params) => ConnectionInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    const [guide] = await Promise.all([
      loadContent(`connections/${params.type}.md`),
      context.dbClient.preloadLiveQuery(connectionInfoQuery(params.type)),
    ]);

    return guide;
  },
  staticData: {
    breadcrumb: <ConnectionBreadcrumb />,
    description:
      "Connect GitHub, GitLab or Jira: what to create at the service, and the Connection's settings and secrets.",
  },
  component: ConnectionPage,
});

function ConnectionBreadcrumb(): ReactNode {
  const { type } = Route.useParams();

  return <BreadcrumbLabel>{connectionLabels[type]}</BreadcrumbLabel>;
}

function ConnectionPage() {
  const { type } = Route.useParams();
  const { data: connection } = useLiveSuspenseQuery(connectionInfoQuery(type));
  const isAdmin = isOrganizationAdmin(useSessionUser());
  const guide = Route.useLoaderData();
  const label = connectionLabels[type];

  return (
    <Page>
      <PageHeader
        title={label}
        icon={<ProviderIcon provider={type} />}
        badge={<ConnectionStatus connected={!!connection} />}
        description={<Markdown mode="static">{guide}</Markdown>}
      />
      {connection ? (
        <ConnectionEditor
          key={type}
          connection={connection}
          isAdmin={isAdmin}
        />
      ) : (
        isAdmin && <ConnectionCreateForm key={type} type={type} />
      )}
    </Page>
  );
}

function ConnectionCreateForm({ type }: { type: ConnectionType }) {
  const { dbClient } = Route.useRouteContext();
  const { settings, secrets } = connectionDefinitions[type];

  const settingFields = connectionFormFields(type, "settings");
  const secretFields = connectionFormFields(type, "secrets");
  const fields = [...settingFields, ...secretFields];

  // Values stay unknown until validated: numeric settings are coerced from their text.
  const schema: z.ZodObject = connectionFields[type];

  const form = useAppForm({
    validators: { onChange: schema },
    defaultValues: Object.fromEntries<unknown>(
      fields.map(({ name }) => [name, ""])
    ),
    onSubmit: async ({ value }) => {
      await dbClient
        .collection(connectionsCollection)
        .insert(
          { type, ...settings.parse(value) },
          { metadata: secrets.parse(value) }
        )
        .when("settled");
    },
  });

  return (
    <form.AppForm>
      <form.Form>
        <FormSection title="Settings" description={settingsDescription}>
          {settingFields.map(({ name, props }) => (
            <form.AppField key={name} name={name}>
              {(field) => <field.TextField {...props} />}
            </form.AppField>
          ))}
        </FormSection>
        <FormSection
          title="Secrets"
          description="Yapir does not show them again."
        >
          {secretFields.map(({ name, props }) => (
            <form.AppField key={name} name={name}>
              {(field) => <field.TextField {...props} />}
            </form.AppField>
          ))}
        </FormSection>
        <FormFooter>
          <form.FormError />
          <div>
            <form.SubmitButton>
              Connect {connectionLabels[type]}
            </form.SubmitButton>
          </div>
        </FormFooter>
      </form.Form>
    </form.AppForm>
  );
}

function ConnectionEditor({
  connection: { type, ...values },
  isAdmin,
}: {
  connection: ConnectionResponseDto;
  isAdmin: boolean;
}) {
  const { dbClient } = Route.useRouteContext();
  const { settings } = connectionDefinitions[type];
  const settingFields = connectionFormFields(type, "settings");
  const secretFields = connectionFormFields(type, "secrets");

  const emptySecrets = Object.fromEntries<unknown>(
    secretFields.map(({ name }) => [name, ""])
  );

  const schema: z.ZodObject = settings.extend(
    Object.fromEntries(
      secretFields.map(({ name, schema: secret }) => [
        name,
        secret.or(z.literal("")),
      ])
    )
  );

  const form = useAppForm({
    validators: { onChange: schema },
    defaultValues: {
      ...Object.fromEntries<unknown>(
        Object.entries(values).map(([name, value]) => [name, String(value)])
      ),
      ...emptySecrets,
    },
    onSubmit: async ({ value, formApi }) => {
      const filled = Object.entries(value).filter(([, field]) => field !== "");
      await updateConnection(
        dbClient,
        type,
        connectionFields[type].partial().parse(Object.fromEntries(filled))
      );
      formApi.reset({ ...value, ...emptySecrets });
    },
  });

  return (
    <>
      <form.AppForm>
        <form.Form>
          <fieldset disabled={!isAdmin} className="grid">
            <FormSection title="Settings" description={settingsDescription}>
              {settingFields.map(({ name, props }) => (
                <form.AppField key={name} name={name}>
                  {(field) => <field.TextField {...props} />}
                </form.AppField>
              ))}
            </FormSection>
            <FormSection
              title="Secrets"
              description="Leave a secret empty to keep its value."
            >
              {secretFields.map(({ name, props }) => (
                <form.AppField key={name} name={name}>
                  {(field) => (
                    <field.TextField {...props} placeholder="••••••••" />
                  )}
                </form.AppField>
              ))}
            </FormSection>
          </fieldset>
          {isAdmin && <form.SaveBar>Save connection</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      {isAdmin && type === "gitlab" && (
        <FormSection
          title="Projects"
          description="Sync after a change at GitLab."
        >
          <div>
            <Button
              variant="outline"
              onClick={() => {
                toast.promise(syncGitlab(dbClient), {
                  loading: "Syncing projects…",
                  success: "Projects synced",
                  error: errorDetail,
                });
              }}
            >
              Sync projects
            </Button>
          </div>
        </FormSection>
      )}
      {isAdmin && (
        <DangerZone>
          <DangerZoneItem
            title="Delete connection"
            description="Yapir erases its settings and secrets permanently."
            action={<ConnectionDeleteButton type={type} />}
          />
        </DangerZone>
      )}
    </>
  );
}

const settingsDescription = "From the steps above.";

function ConnectionDeleteButton({ type }: { type: ConnectionType }) {
  const { dbClient } = Route.useRouteContext();
  const label = connectionLabels[type];

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete connection
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the {label} connection?</AlertDialogTitle>
          <AlertDialogDescription>
            Yapir loses its access to {label}. To connect it again, enter the
            settings and secrets again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              void toastFailure(
                dbClient.collection(connectionsCollection).delete(type)
              );
            }}
          >
            Delete connection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
