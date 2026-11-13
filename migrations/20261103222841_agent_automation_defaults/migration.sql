DROP TABLE "preset";--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "triggers" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "capabilities" jsonb DEFAULT '[]' NOT NULL;