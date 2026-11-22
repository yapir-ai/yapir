CREATE TABLE "workflow" (
	"id" uuid PRIMARY KEY,
	"type" text NOT NULL,
	"root_id" uuid NOT NULL,
	"parent_id" uuid,
	"fields" jsonb NOT NULL,
	"journal" jsonb NOT NULL,
	"result" jsonb,
	"wake_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workflow_root_id_index" ON "workflow" ("root_id");--> statement-breakpoint
CREATE INDEX "workflow_wake_at_index" ON "workflow" ("wake_at") WHERE "wake_at" is not null;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_root_id_workflow_id_fkey" FOREIGN KEY ("root_id") REFERENCES "workflow"("id") ON DELETE CASCADE;