ALTER TABLE "project" ADD COLUMN "ci_repository_id" uuid;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_ci_repository_id_repository_id_fkey" FOREIGN KEY ("ci_repository_id") REFERENCES "repository"("id");--> statement-breakpoint
UPDATE "project" SET "ci_repository_id" = (
  SELECT "repository_id" FROM "project_repository"
  WHERE "project_repository"."project_id" = "project"."id"
  ORDER BY "repository_id" LIMIT 1
);
