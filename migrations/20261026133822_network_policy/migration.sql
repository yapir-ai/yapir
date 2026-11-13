CREATE TABLE "network_policy" (
	"id" boolean PRIMARY KEY DEFAULT true,
	"enabled" boolean DEFAULT false NOT NULL,
	"include_yapir_hosts" boolean DEFAULT true NOT NULL,
	"hosts" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "network_policy_single_row" CHECK ("id")
);
