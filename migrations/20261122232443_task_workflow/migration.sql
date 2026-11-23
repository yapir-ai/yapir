UPDATE "task_event" SET "state" = 'pending', "execution_id" = NULL WHERE "state" = 'delivered' AND "execution_id" IN (SELECT "id" FROM "execution" WHERE "outcome" IS NULL);--> statement-breakpoint
UPDATE "execution" SET "outcome" = 'failed', "error" = 'Interrupted by an upgrade', "ended_at" = date_trunc('milliseconds', now()) WHERE "outcome" IS NULL;--> statement-breakpoint
UPDATE "task" SET "state" = 'idle', "active_execution_id" = NULL, "state_changed_at" = date_trunc('milliseconds', now()) WHERE "state" IN ('queued', 'running');--> statement-breakpoint
INSERT INTO "workflow" ("id", "type", "root_id", "fields", "journal", "created_at")
SELECT "task"."id", 'task', "task"."id", "resting"."fields", jsonb_build_array(jsonb_build_object('kind', 'run', 'args', '[]'::jsonb, 'fields', "resting"."fields", 'at', floor(extract(epoch FROM now()) * 1000)::bigint)), "task"."created_at"
FROM "task"
JOIN "automation" ON "automation"."id" = "task"."automation_id"
CROSS JOIN LATERAL (
  SELECT jsonb_build_object(
    'state', jsonb_build_object('value', "task"."state"),
    'stateChangedAt', jsonb_build_object('value', floor(extract(epoch FROM "task"."state_changed_at") * 1000)::bigint),
    'consecutiveFailures', jsonb_build_object('value', "task"."consecutive_failures"),
    'dispatcher', jsonb_build_object('value', "automation"."dispatcher"),
    'pending', jsonb_build_object('value', (
      SELECT coalesce(jsonb_agg("task_event"."event_id" ORDER BY "task_event"."received_at"), '[]'::jsonb)
      FROM "task_event"
      WHERE "task_event"."task_id" = "task"."id" AND "task_event"."state" = 'pending'
    )),
    'awakened', jsonb_build_object('value', false),
    'execution', '{}'::jsonb
  ) AS "fields"
) AS "resting";
