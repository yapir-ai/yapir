import { McpServerCreateRequest } from "@server/lib/mcp-servers/mcp-server-create.dto";
import type { McpServerUpdateRequestDto } from "@server/lib/mcp-servers/mcp-server-update.dto";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { invalidateCapabilities } from "@web/lib/capabilities/capability.collection";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api["mcp-servers"];

const InsertMetadata = McpServerCreateRequest.pick({ headerValue: true });

export const mcpServersCollection = collection(
  "mcp-servers",
  {
    syncMode: "eager",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex<string>,
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(api.$get({ query: page }, { init: { signal } }))
      ),
    getKey: (mcpServer) => mcpServer.id,
  },
  (dbClient) => ({
    onInsert: async ({ transaction, collection: mcpServers }) => {
      await Promise.all(
        transaction.mutations.map(async ({ modified, metadata }) => {
          const { id, name, url, headerName, fixedIp } = modified;

          const mcpServer = await parseResponse(
            api.$post({
              json: {
                id,
                name,
                url,
                headerName: headerName ?? undefined,
                fixedIp,
                ...InsertMetadata.parse(metadata),
              },
            })
          );

          await mcpServers.utils.writeUpsert(mcpServer);
          toast.success("MCP server created");
        })
      );
      await invalidateCapabilities(dbClient);
    },
    onUpdate: async ({ transaction, collection: mcpServers }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const param = { mcpServerId: mutation.modified.id };
          const item = api[":mcpServerId"];

          await persistSoftDeletableMutation(mutation, {
            label: "MCP server",
            upsert: mcpServers.utils.writeUpsert,
            remove: async () => await parseResponse(item.$delete({ param })),
            restore: async () =>
              await parseResponse(item.restore.$post({ param })),
          });
        })
      );
      await invalidateCapabilities(dbClient);
    },
  })
);

// The header value is not part of the collection's items: an update carrying only the value changes none of them.
export async function updateMcpServer(
  dbClient: DbClient,
  mcpServerId: string,
  request: McpServerUpdateRequestDto
) {
  const mcpServer = await parseResponse(
    api[":mcpServerId"].$patch({ param: { mcpServerId }, json: request })
  );

  await dbClient.collection(mcpServersCollection).utils.writeUpsert(mcpServer);
  await invalidateCapabilities(dbClient);
  toast.success("MCP server updated");
}
