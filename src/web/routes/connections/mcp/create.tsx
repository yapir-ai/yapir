import { McpServerCreateRequest } from "@server/lib/mcp-servers/mcp-server-create.dto";
import {
  mcpServerSlug,
  mcpToolName,
} from "@server/lib/mcp-servers/mcp-server.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { buttonVariants } from "@web/components/ui/button";
import { FormFooter, FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { fixedIpQuery } from "@web/lib/fixed-ip/fixed-ip.queries";
import { mcpServersCollection } from "@web/lib/mcp-servers/mcp-server.collection";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

export const Route = createFileRoute("/connections/mcp/create")({
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(fixedIpQuery()),
  staticData: {
    breadcrumb: "Add MCP server",
    description:
      "Add a remote MCP server: Yapir lists its tools, which automations can grant their agent.",
  },
  component: McpServerCreatePage,
});

const CreateForm = McpServerCreateRequest.extend({
  headerName: z.string().trim(),
  headerValue: z.string().trim(),
  fixedIp: z.boolean(),
});

function McpServerCreatePage() {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const fixedIpAddress = useLiveSuspenseQuery(fixedIpQuery()).data!.address;

  const defaultValues: z.input<typeof CreateForm> = {
    name: "",
    url: "",
    headerName: "",
    headerValue: "",
    fixedIp: false,
  };

  const form = useAppForm({
    validators: { onChange: CreateForm },
    defaultValues,
    onSubmit: async ({ value: { headerName, headerValue, ...value } }) => {
      const id = uuidv7();
      await dbClient
        .collection(mcpServersCollection)
        .insert(
          {
            ...value,
            id,
            slug: mcpServerSlug(value.name),
            deletedAt: null,
            headerName: headerName || null,
            tools: [],
          },
          { metadata: { headerValue: headerValue || undefined } }
        )
        .when("settled");
      await navigate({
        to: "/connections/mcp/$mcpServerId",
        params: { mcpServerId: id },
      });
    },
  });

  return (
    <Page>
      <PageHeader title="Add MCP server" />
      <form.AppForm>
        <form.Form>
          <FormSection title="General">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Name"
                  description={`Agents call its tools ${mcpToolName(mcpServerSlug(field.state.value), "<tool>")}.`}
                />
              )}
            </form.AppField>
            <form.AppField name="url">
              {(field) => (
                <field.TextField
                  label="URL"
                  type="url"
                  description="A Streamable HTTP endpoint."
                />
              )}
            </form.AppField>
          </FormSection>
          <FormSection
            title="Authentication"
            description="Optional. Yapir sends it with each request."
          >
            <form.AppField name="headerName">
              {(field) => <field.TextField label="Header" />}
            </form.AppField>
            <form.AppField name="headerValue">
              {(field) => (
                <field.TextField
                  label="Header value"
                  type="password"
                  autoComplete="off"
                  description="Such as Bearer <token>."
                />
              )}
            </form.AppField>
          </FormSection>
          {fixedIpAddress && (
            <FormSection title="Network">
              <form.AppField name="fixedIp">
                {(field) => (
                  <field.SwitchField
                    label="Fixed IP"
                    description={fixedIpAddress}
                  />
                )}
              </form.AppField>
            </FormSection>
          )}
          <FormFooter>
            <form.FormError />
            <div className="flex gap-2">
              <form.SubmitButton>Add MCP server</form.SubmitButton>
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
