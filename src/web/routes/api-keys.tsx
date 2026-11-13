import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { CopySnippet } from "@web/components/copy-snippet";
import { useAppForm } from "@web/components/form/app-form";
import { ListPagination } from "@web/components/list-controls";
import { Button } from "@web/components/ui/button";
import { Code } from "@web/components/ui/code";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@web/components/ui/field";
import { Page, PageHeader } from "@web/components/ui/page";
import { RelativeTime } from "@web/components/ui/relative-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@web/components/ui/table";
import { apiKeysCollection } from "@web/lib/api-keys/api-key.collection";
import { apiKeyListQuery } from "@web/lib/api-keys/api-key.queries";
import { authClient } from "@web/lib/auth/auth-client";
import { toastFailure } from "@web/lib/errors";
import {
  listPage,
  listRouteSearch,
  ListRouteSearch,
} from "@web/lib/lists/list.route";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/api-keys")({
  ...listRouteSearch(ListRouteSearch.pick({ offset: true })),
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(apiKeyListQuery),
  staticData: { breadcrumb: "API keys" },
  component: ApiKeysPage,
});

const ApiKeyCreateForm = z.object({ name: z.string().trim().min(1) });

function ApiKeysPage() {
  const { dbClient } = Route.useRouteContext();
  const { data } = useLiveSuspenseQuery(apiKeyListQuery);
  const { offset } = Route.useSearch();
  const page = listPage(data, offset);
  const apiKeys = dbClient.collection(apiKeysCollection);
  const [createdKey, setCreatedKey] = useState<string>();

  const form = useAppForm({
    validators: { onChange: ApiKeyCreateForm },
    defaultValues: { name: "" },
    onSubmit: async ({ value, formApi }) => {
      const { key, ...apiKey } = await authClient.apiKey.create({
        name: value.name,
        fetchOptions: { throw: true },
      });

      await apiKeys.utils.writeInsert(apiKey);
      toast.success("API key created");
      setCreatedKey(key);
      formApi.reset();
    },
  });

  return (
    <Page>
      <PageHeader
        title="API keys"
        description="An API key lets the Yapir CLI act as you, with your permissions."
      />
      <form.AppForm>
        <form.Form>
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" />}
          </form.AppField>
          <form.FormError />
          <div>
            <form.SubmitButton>Create API key</form.SubmitButton>
          </div>
        </form.Form>
      </form.AppForm>
      {createdKey && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="created-api-key">New API key</FieldLabel>
            <CopySnippet id="created-api-key" code={createdKey} />
            <FieldDescription>
              Copy it now: it is not shown again.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="cli-login-command">
              Log in with the CLI
            </FieldLabel>
            <CopySnippet
              id="cli-login-command"
              code={`npx @yapir-ai/cli login --url ${window.location.origin} --key ${createdKey}`}
            />
          </Field>
        </FieldGroup>
      )}
      {data.length === 0 ? (
        <Empty variant="outline">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRound aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              Create an API key above to log in with the Yapir CLI.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell grow>{apiKey.name}</TableCell>
                <TableCell variant="muted">
                  <Code>{apiKey.start}…</Code>
                </TableCell>
                <TableCell variant="muted">
                  <RelativeTime date={apiKey.createdAt} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void toastFailure(apiKeys.delete(apiKey.id));
                    }}
                  >
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={page.length}
        total={data.length}
        noun={["API key", "API keys"]}
      />
    </Page>
  );
}
