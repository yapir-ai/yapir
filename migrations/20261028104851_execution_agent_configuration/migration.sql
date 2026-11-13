ALTER TABLE "execution" ADD COLUMN "model_provider_id" uuid;--> statement-breakpoint
ALTER TABLE "execution" ADD COLUMN "effort" text;--> statement-breakpoint
ALTER TABLE "execution" ADD COLUMN "harness" text;--> statement-breakpoint
UPDATE "execution" SET "model_provider_id" = "agent"."model_provider_id", "effort" = "agent"."effort", "harness" = "agent"."harness"
FROM "agent" WHERE "agent"."id" = "execution"."agent_id";--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_model_provider_id_model_provider_id_fkey" FOREIGN KEY ("model_provider_id") REFERENCES "model_provider"("id");