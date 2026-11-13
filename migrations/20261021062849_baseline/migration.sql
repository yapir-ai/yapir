CREATE TYPE "connection_type" AS ENUM('github', 'gitlab', 'jira');--> statement-breakpoint
CREATE TYPE "execution_state" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "organization_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "repository_provider" AS ENUM('github', 'gitlab');--> statement-breakpoint
CREATE TYPE "repository_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "webhook_auth" AS ENUM('header', 'hmac');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"model_provider_id" uuid NOT NULL,
	"model" text NOT NULL,
	"effort" text,
	"harness" text NOT NULL,
	"prompt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" uuid PRIMARY KEY,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" uuid NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp with time zone,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "automation" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"agent_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"triggers" jsonb DEFAULT '[]' NOT NULL,
	"capabilities" jsonb DEFAULT '[]' NOT NULL,
	"dispatcher" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection" (
	"type" "connection_type" PRIMARY KEY,
	"settings" jsonb NOT NULL,
	"secrets" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"title" text,
	"messages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "defaults" (
	"id" boolean PRIMARY KEY DEFAULT true,
	"model_provider_id" uuid NOT NULL,
	"model" text NOT NULL,
	"effort" text,
	"harness" text DEFAULT 'opencode' NOT NULL,
	"dispatcher" text,
	CONSTRAINT "defaults_single_row" CHECK ("id")
);
--> statement-breakpoint
CREATE TABLE "effect" (
	"integration" text,
	"host" text,
	"kind" text,
	"external_id" text,
	"automation_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"execution_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"presentation" jsonb NOT NULL,
	CONSTRAINT "effect_pkey" PRIMARY KEY("integration","host","kind","external_id")
);
--> statement-breakpoint
CREATE TABLE "execution_message" (
	"id" uuid PRIMARY KEY,
	"execution_id" uuid NOT NULL,
	"message" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution" (
	"id" uuid PRIMARY KEY,
	"task_id" uuid NOT NULL,
	"state" "execution_state" DEFAULT 'queued'::"execution_state" NOT NULL,
	"dispatcher" text NOT NULL,
	"claim_hash" text NOT NULL,
	"token_hash" text UNIQUE,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"agent_id" uuid,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "mcp_server" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"url" text NOT NULL,
	"header_name" text,
	"header_value" text,
	"tools" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_provider" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"catalog_id" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preset" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"prompt" text NOT NULL,
	"triggers" jsonb DEFAULT '[]' NOT NULL,
	"capabilities" jsonb DEFAULT '[]' NOT NULL,
	"agent_id" uuid
);
--> statement-breakpoint
CREATE TABLE "repository_member" (
	"repository_id" uuid,
	"user_id" uuid,
	"role" "repository_role" NOT NULL,
	CONSTRAINT "repository_member_pkey" PRIMARY KEY("repository_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" uuid PRIMARY KEY,
	"provider" "repository_provider" NOT NULL,
	"host" text NOT NULL,
	"external_id" text NOT NULL,
	"path" text NOT NULL,
	CONSTRAINT "repository_host_external_id_unique" UNIQUE("host","external_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text NOT NULL,
	"author_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_association" (
	"automation_id" uuid,
	"task_id" uuid NOT NULL,
	"integration" text,
	"host" text,
	"kind" text,
	"external_id" text,
	"presentation" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_association_pkey" PRIMARY KEY("automation_id","integration","host","kind","external_id")
);
--> statement-breakpoint
CREATE TABLE "task_event" (
	"task_id" uuid,
	"event_id" text,
	"notification" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"execution_id" uuid,
	"acknowledged_at" timestamp with time zone,
	CONSTRAINT "task_event_pkey" PRIMARY KEY("task_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY,
	"automation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_execution_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_id_automation_id_unique" UNIQUE("id","automation_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" "organization_role" DEFAULT 'user'::"organization_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY,
	"name" text NOT NULL,
	"auth" "webhook_auth" NOT NULL,
	"header_name" text NOT NULL,
	"secret" text NOT NULL,
	"prefix" text,
	"delivery_id_header" text
);
--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_config_id_index" ON "apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_reference_id_index" ON "apikey" ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_index" ON "apikey" ("key");--> statement-breakpoint
CREATE INDEX "conversation_user_id_id_index" ON "conversation" ("user_id","id");--> statement-breakpoint
CREATE INDEX "effect_task_id_created_at_index" ON "effect" ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "execution_message_execution_id_id_index" ON "execution_message" ("execution_id","id");--> statement-breakpoint
CREATE INDEX "execution_task_id_created_at_index" ON "execution" ("task_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "execution_active_task_index" ON "execution" ("task_id") WHERE "state" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "task_association_task_id_index" ON "task_association" ("task_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_model_provider_id_model_provider_id_fkey" FOREIGN KEY ("model_provider_id") REFERENCES "model_provider"("id");--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_reference_id_user_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "automation" ADD CONSTRAINT "automation_agent_id_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id");--> statement-breakpoint
ALTER TABLE "automation" ADD CONSTRAINT "automation_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id");--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "defaults" ADD CONSTRAINT "defaults_model_provider_id_model_provider_id_fkey" FOREIGN KEY ("model_provider_id") REFERENCES "model_provider"("id");--> statement-breakpoint
ALTER TABLE "effect" ADD CONSTRAINT "effect_automation_id_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automation"("id");--> statement-breakpoint
ALTER TABLE "effect" ADD CONSTRAINT "effect_task_id_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id");--> statement-breakpoint
ALTER TABLE "effect" ADD CONSTRAINT "effect_execution_id_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "execution"("id");--> statement-breakpoint
ALTER TABLE "execution_message" ADD CONSTRAINT "execution_message_execution_id_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "execution"("id");--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_task_id_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id");--> statement-breakpoint
ALTER TABLE "execution" ADD CONSTRAINT "execution_agent_id_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id");--> statement-breakpoint
ALTER TABLE "preset" ADD CONSTRAINT "preset_agent_id_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id");--> statement-breakpoint
ALTER TABLE "repository_member" ADD CONSTRAINT "repository_member_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_member" ADD CONSTRAINT "repository_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "skill" ADD CONSTRAINT "skill_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "task_association" ADD CONSTRAINT "task_association_zXYkotEB9Z17_fkey" FOREIGN KEY ("task_id","automation_id") REFERENCES "task"("id","automation_id");--> statement-breakpoint
ALTER TABLE "task_event" ADD CONSTRAINT "task_event_task_id_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id");--> statement-breakpoint
ALTER TABLE "task_event" ADD CONSTRAINT "task_event_execution_id_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "execution"("id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_automation_id_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automation"("id");--> statement-breakpoint
INSERT INTO "preset" ("id", "name", "description", "prompt", "triggers", "capabilities") VALUES
	($seed$01a14014-ffff-77ca-8e7a-c72a01d58074$seed$, $seed$Reviewer$seed$, $seed$Reviews each pull or merge request when it is opened or pushed, and answers the replies to its review.$seed$, $seed$You review the change requests (pull requests or merge requests) of this repository.

On each notification about a change request:
1. Read the change request, its discussions, its diff and its existing reviews with your tools. Skip a commit you already reviewed.
2. Read the repository's documented standards (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, coding standards) and the code around the change.
3. Look for real defects: bugs, broken behavior, security issues, and clear breaches of the documented standards. Leave out style preferences, nitpicks and anything a linter or the CI already catches.
4. Resolve each of your open threads whose finding the head commit fixes.
5. Submit one review at the head commit you inspected. Post each finding as an inline comment on its line of the diff: the problem and a concrete fix. Do not post again a finding that one of your open threads already holds. The summary states your verdict in one or two sentences, and the findings that no line of the diff can hold. Request changes only for a defect that must be fixed before merging; otherwise comment. A review without findings is a valid review.

When someone answers in one of your threads, reply in that thread: when the head commit fixes the finding, acknowledge it and resolve the thread; otherwise explain your point once more and leave the decision to them.

Never resolve a thread that someone else opened, and never reopen a thread. Do not change code or push.$seed$, $seed$[
  {
    "type": "github.pull_request.opened",
    "expression": "true"
  },
  {
    "type": "github.pull_request.synchronize",
    "expression": "true"
  },
  {
    "type": "github.issue_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "github.pull_request_review_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "gitlab.merge_request.open",
    "expression": "true"
  },
  {
    "type": "gitlab.merge_request.update",
    "expression": "has(event.object_attributes.oldrev)"
  },
  {
    "type": "gitlab.note.create",
    "expression": "yapir.task != null"
  }
]$seed$, $seed$[
  {
    "name": "github.pull_requests.review",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.reply",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.review",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.reply",
    "unscoped": false
  }
]$seed$),
	($seed$01a14015-0002-765a-9939-b0cd13c3796c$seed$, $seed$Housekeeper$seed$, $seed$Every day, opens a small pull or merge request that simplifies the codebase, with at most 2 open at a time.$seed$, $seed$You are the housekeeper of this repository. Each run ships at most one change that leaves the codebase better with less: the code reads plainer, the behavior stays the same, and a reviewer approves it in five minutes. A run that ships nothing because nothing met the bar is a good run.

On a scheduled run:
1. List your open change requests. When 2 or more are open, stop without changes. Otherwise, read them and do not touch the files they change.
2. List at least three candidates across the codebase, then choose the one with the most gain for the least review effort. Good candidates remove duplicated logic, delete unused code, replace a complex implementation with a simple one, or bring code in line with the project's documented standards (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, coding standards). Do not add tests, error handling or documentation to unchanged code. Before you call something unused, search every way it can be reached: configuration, routing, dependency injection, migrations.
3. Create a branch named yapir/housekeeping-<theme> from the default branch and apply the change. Run the project's checks and build as its documentation or CI describes. Drop the change if you cannot make them pass.
4. Commit following the project's commit convention, push, and open a change request: one sentence on what is simpler, the before and after, and the proof (the search showing nothing uses it, or the checks covering the equivalence).

On a comment on one of your change requests: read the whole discussion, apply the requested changes on its branch, verify, push, and reply.$seed$, $seed$[
  {
    "cron": "0 6 * * *",
    "type": "schedule.cron"
  },
  {
    "type": "github.issue_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "github.pull_request_review_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "gitlab.note.create",
    "expression": "yapir.task != null"
  }
]$seed$, $seed$[
  {
    "name": "github.code.push",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.create",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.read",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.reply",
    "unscoped": false
  },
  {
    "name": "gitlab.code.push",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.create",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.read",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.reply",
    "unscoped": false
  }
]$seed$),
	($seed$01a14015-0004-71f7-848b-c4015eaf3449$seed$, $seed$Implementer$seed$, $seed$Implements the issues labeled yapir in a pull or merge request, then addresses the review.$seed$, $seed$You implement the issues of this repository and carry them through review.

When an issue is labeled for you:
1. Read the issue and its discussion. When it is too unclear to implement, ask your questions in a comment and stop.
2. Acknowledge the issue in a short comment.
3. Read the project's documented conventions (AGENTS.md, CLAUDE.md, CONTRIBUTING.md) and the code concerned. Create a branch named yapir/<issue number>-<short-slug> from the default branch.
4. Implement the smallest change that resolves the issue, following the project's conventions. Add or update tests where the project expects them. Run the project's checks and build as its documentation or CI describes.
5. Commit following the project's commit convention, push, and open a change request that references the issue and explains what changed and how you verified it.

When a comment arrives on the issue or the change request, or a review is submitted: read the whole discussion first. Apply the requested changes on the change request's branch, verify, push, and reply in the thread concerned. A notification can describe work already done: check before acting, and do nothing twice.$seed$, $seed$[
  {
    "type": "github.issues.labeled",
    "expression": "event.label.name == \"yapir\""
  },
  {
    "type": "github.issue_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "github.pull_request_review_comment.created",
    "expression": "yapir.task != null"
  },
  {
    "type": "github.pull_request_review.submitted",
    "expression": "yapir.task != null"
  },
  {
    "type": "gitlab.issue.update",
    "expression": "has(event.changes.labels) && event.changes.labels.current.exists(label, label.title == \"yapir\") && !event.changes.labels.previous.exists(label, label.title == \"yapir\")"
  },
  {
    "type": "gitlab.note.create",
    "expression": "yapir.task != null"
  },
  {
    "type": "gitlab.merge_request.update",
    "expression": "yapir.task != null && has(event.changes.reviewers) && event.changes.reviewers.current.exists(reviewer, reviewer.state == \"requested_changes\")"
  }
]$seed$, $seed$[
  {
    "name": "github.issues.comment",
    "unscoped": false
  },
  {
    "name": "github.code.push",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.create",
    "unscoped": false
  },
  {
    "name": "github.pull_requests.reply",
    "unscoped": false
  },
  {
    "name": "gitlab.issues.comment",
    "unscoped": false
  },
  {
    "name": "gitlab.code.push",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.create",
    "unscoped": false
  },
  {
    "name": "gitlab.merge_requests.reply",
    "unscoped": false
  }
]$seed$);