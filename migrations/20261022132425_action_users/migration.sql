ALTER TABLE "execution" ADD COLUMN "stopped_by_id" uuid;--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_stopped_by_id_user_id_fkey" FOREIGN KEY ("stopped_by_id") REFERENCES "user"("id");--> statement-breakpoint
UPDATE "task_event" SET "notification" = jsonb_set("notification" #- '{data,userImage}', '{data,userId}', to_jsonb("user"."id"))
FROM "user"
WHERE "task_event"."notification"->>'type' = 'yapir.message' AND "user"."name" = "task_event"."notification"->'data'->>'userName';
