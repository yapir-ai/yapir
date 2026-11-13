CREATE TABLE "cron_tick" (
	"id" boolean PRIMARY KEY DEFAULT true,
	"scheduled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cron_tick_single_row" CHECK ("id")
);
