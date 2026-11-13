ALTER TABLE "mcp_server" DROP CONSTRAINT "mcp_server_name_key";--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "mcp_server" SET "slug" = "name";--> statement-breakpoint
ALTER TABLE "mcp_server" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_slug_key" UNIQUE("slug");
