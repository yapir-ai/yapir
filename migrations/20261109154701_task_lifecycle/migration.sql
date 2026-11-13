DELETE FROM "task";--> statement-breakpoint
CREATE TYPE "execution_outcome" AS ENUM('succeeded', 'failed', 'stopped');--> statement-breakpoint
CREATE TYPE "task_event_state" AS ENUM('pending', 'delivered', 'acknowledged');--> statement-breakpoint
CREATE TYPE "task_state" AS ENUM('idle', 'queued', 'running', 'blocked', 'stopped');--> statement-breakpoint
DROP INDEX "execution_task_id_created_at_index";--> statement-breakpoint
DROP INDEX "execution_active_task_index";--> statement-breakpoint
ALTER TABLE "execution" ADD COLUMN "outcome" "execution_outcome";--> statement-breakpoint
ALTER TABLE "execution" ADD COLUMN "queued_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "task_event" ADD COLUMN "state" "task_event_state" DEFAULT 'pending'::"task_event_state" NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "state" "task_state" NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "active_execution_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "state_changed_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "execution" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "execution" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "task_event" DROP COLUMN "acknowledged_at";--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "last_execution_at";--> statement-breakpoint
CREATE UNIQUE INDEX "execution_active_task_index" ON "execution" ("task_id") WHERE "outcome" is null;--> statement-breakpoint
CREATE INDEX "execution_task_id_queued_at_index" ON "execution" ("task_id","queued_at");--> statement-breakpoint
ALTER TABLE "task_event" ADD CONSTRAINT "task_event_delivery" CHECK (("state" = 'pending') = ("execution_id" is null));--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_active_attempt" CHECK (("state" in ('queued', 'running')) = ("active_execution_id" is not null));--> statement-breakpoint
DROP TYPE "execution_state";