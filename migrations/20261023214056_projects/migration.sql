CREATE TYPE "project_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "project_member" (
	"project_id" uuid,
	"user_id" uuid,
	"role" "project_role" NOT NULL,
	CONSTRAINT "project_member_pkey" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_repository" (
	"project_id" uuid,
	"repository_id" uuid,
	CONSTRAINT "project_repository_pkey" PRIMARY KEY("project_id","repository_id")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
DELETE FROM "task";--> statement-breakpoint
INSERT INTO "project" ("id", "name")
SELECT "id", "path" FROM "repository"
WHERE EXISTS (SELECT FROM "automation" WHERE "automation"."repository_id" = "repository"."id")
  OR EXISTS (SELECT FROM "repository_member" WHERE "repository_member"."repository_id" = "repository"."id");--> statement-breakpoint
INSERT INTO "project_repository" ("project_id", "repository_id") SELECT "id", "id" FROM "project";--> statement-breakpoint
INSERT INTO "project_member" ("project_id", "user_id", "role")
SELECT "repository_id", "user_id", "role"::text::"project_role" FROM "repository_member";--> statement-breakpoint
ALTER TABLE "automation" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "automation" ADD COLUMN "ci_repository_id" uuid;--> statement-breakpoint
UPDATE "automation" SET "project_id" = "repository_id", "ci_repository_id" = "repository_id";--> statement-breakpoint
ALTER TABLE "automation" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "automation" DROP CONSTRAINT "automation_repository_id_repository_id_fkey";--> statement-breakpoint
DROP TABLE "repository_member";--> statement-breakpoint
ALTER TABLE "automation" DROP COLUMN "repository_id";--> statement-breakpoint
DROP TYPE "repository_role";--> statement-breakpoint
CREATE INDEX "project_repository_repository_id_index" ON "project_repository" ("repository_id");--> statement-breakpoint
ALTER TABLE "automation" ADD CONSTRAINT "automation_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id");--> statement-breakpoint
ALTER TABLE "automation" ADD CONSTRAINT "automation_ci_repository_id_fkey" FOREIGN KEY ("project_id","ci_repository_id") REFERENCES "project_repository"("project_id","repository_id");--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_project_id_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id");--> statement-breakpoint
ALTER TABLE "project_repository" ADD CONSTRAINT "project_repository_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id");
