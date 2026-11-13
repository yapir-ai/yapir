import { isOrganizationAdmin } from "@server/lib/auth/access";
import { McpServerInfoParams } from "@server/lib/mcp-servers/mcp-server-info.dto";
import { McpServerUpdateRequest } from "@server/lib/mcp-servers/mcp-server-update.dto";
import {
  McpServerHeaderValue,
  mcpServerSlug,
  mcpToolName,
} from "@server/lib/mcp-servers/mcp-server.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import {
  DeletedBadge,
  SoftDeleteZone,
  useSoftDelete,
} from "@web/components/soft-delete-controls";
import {
  Disclosure,
  DisclosureContent,
  DisclosureHeader,
  DisclosureMeta,
  DisclosureTrigger,
} from "@web/components/ui/disclosure";
import { Empty, EmptyHeader, EmptyTitle } from "@web/components/ui/empty";
import { FormSection } from "@web/components/ui/form-section";
import { InfoTooltip } from "@web/components/ui/info-tooltip";
import { Page, PageHeader } from "@web/components/ui/page";
import { useSessionUser } from "@web/lib/auth/session";
import { fixedIpQuery } from "@web/lib/fixed-ip/fixed-ip.queries";
import {
  mcpServersCollection,
  updateMcpServer,
} from "@web/lib/mcp-servers/mcp-server.collection";
import { mcpServerInfoQuery } from "@web/lib/mcp-servers/mcp-server.queries";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import { Plug } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

export const Route = createFileRoute("/connections/mcp/$mcpServerId")({
  params: { parse: (params) => McpServerInfoParams.parse(params) },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.dbClient.preloadLiveQuery(mcpServerInfoQuery(params.mcpServerId)),
      context.dbClient.preloadLiveQuery(fixedIpQuery()),
    ]);
  },
  staticData: {
    breadcrumb: <McpServerBreadcrumb />,
    description:
      "Edit an MCP server: its endpoint, its header, and the tools Yapir found there.",
  },
  component: McpServerInfoPage,
  notFoundComponent: () => (
    <Page>
      <PageHeader title="MCP server not found" />
    </Page>
  ),
});

const McpServerForm = McpServerUpdateRequest.required()
  .pick({ name: true, url: true, fixedIp: true })
  .extend({
    headerName: z.string().trim(),
    headerValue: McpServerHeaderValue.or(z.literal("")),
  });

function McpServerBreadcrumb(): ReactNode {
  const { mcpServerId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(mcpServerInfoQuery(mcpServerId));

  return <BreadcrumbLabel>{data?.name ?? "MCP server"}</BreadcrumbLabel>;
}

function McpServerInfoPage() {
  const { mcpServerId } = Route.useParams();

  return <McpServerEditor key={mcpServerId} mcpServerId={mcpServerId} />;
}

function McpServerEditor({ mcpServerId }: { mcpServerId: string }) {
  const { dbClient } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const { data: mcpServer } = useLiveSuspenseQuery(
    mcpServerInfoQuery(mcpServerId)
  );

  const fixedIpAddress = useLiveSuspenseQuery(fixedIpQuery()).data!.address;

  if (!mcpServer) {
    throw notFound({ routeId: Route.id });
  }

  const isAdmin = isOrganizationAdmin(useSessionUser());
  const mcpServers = dbClient.collection(mcpServersCollection);

  const { isPending, remove, restore } = useSoftDelete(
    mcpServers,
    mcpServerId,
    async () => await navigate({ to: "/connections" })
  );

  const readOnly = isPending || !isAdmin || !!mcpServer.deletedAt;

  const form = useAppForm({
    validators: { onChange: McpServerForm },
    defaultValues: {
      name: mcpServer.name,
      url: mcpServer.url,
      headerName: mcpServer.headerName ?? "",
      headerValue: "",
      fixedIp: mcpServer.fixedIp,
    },
    onSubmit: async ({ value, formApi }) => {
      const { headerName, headerValue, fixedIp, ...settings } = value;
      await updateMcpServer(dbClient, mcpServerId, {
        ...settings,
        headerName: headerName || null,
        headerValue: headerValue || undefined,
        fixedIp: fixedIpAddress ? fixedIp : undefined,
      });
      formApi.reset({ ...value, headerValue: "" });
    },
  });

  return (
    <Page>
      <PageHeader
        title={mcpServer.name}
        icon={<Plug aria-hidden="true" />}
        badge={<DeletedBadge deletedAt={mcpServer.deletedAt} />}
        description="Automations grant its tools to their agent. Yapir does not restrict what they do: grant only the tools the agent needs."
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={readOnly} className="grid">
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
                    placeholder={mcpServer.headerName ? "••••••••" : undefined}
                    description="Leave empty to keep the current value."
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
          </fieldset>
          {!readOnly && <form.SaveBar>Save MCP server</form.SaveBar>}
        </form.Form>
      </form.AppForm>
      <FormSection title="Tools">
        {mcpServer.tools.length === 0 ? (
          <Empty variant="outline" size="sm">
            <EmptyHeader>
              <EmptyTitle>
                No tools found: check the URL and the header
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <Disclosure>
            <DisclosureHeader>
              <DisclosureTrigger>
                Tools found
                <DisclosureMeta>{mcpServer.tools.length}</DisclosureMeta>
              </DisclosureTrigger>
            </DisclosureHeader>
            <DisclosureContent>
              <ul className="space-y-2 text-sm">
                {mcpServer.tools.map((tool) => (
                  <li key={tool.name} className="flex items-center gap-2">
                    {tool.name}
                    {tool.description && (
                      <InfoTooltip
                        label={tool.name}
                        description={tool.description}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
        )}
      </FormSection>
      <SoftDeleteZone
        resource="MCP server"
        consequence="Agents lose its tools."
        deletedAt={mcpServer.deletedAt}
        canWrite={isAdmin}
        isPending={isPending}
        onDelete={remove}
        onRestore={restore}
      />
    </Page>
  );
}
