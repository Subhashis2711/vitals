CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill: give every existing user a "Personal" workspace to migrate their data into.
INSERT INTO "workspaces" ("id", "user_id", "name", "position")
SELECT gen_random_uuid(), "id", 'Personal', 0 FROM "auth"."users";--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "health_activity_logs" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "health_daily_logs" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_topics" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
-- Backfill: point every existing row at its owner's new "Personal" workspace.
UPDATE "calendar_events" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "goals" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "habit_logs" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "habits" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "health_activity_logs" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "health_daily_logs" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "journal" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "learning_resources" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "learning_topics" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "notes" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "pomodoro_sessions" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "projects" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "savings_goals" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "templates" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "todos" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
UPDATE "transactions" t SET "workspace_id" = w."id" FROM "workspaces" w WHERE w."user_id" = t."user_id";--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "habit_logs" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "health_activity_logs" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "health_daily_logs" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "journal" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_resources" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_topics" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "savings_goals" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_activity_logs" ADD CONSTRAINT "health_activity_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_daily_logs" ADD CONSTRAINT "health_daily_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_topics" ADD CONSTRAINT "learning_topics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP INDEX "health_daily_logs_user_id_date_idx";--> statement-breakpoint
DROP INDEX "journal_user_id_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "health_daily_logs_workspace_id_date_idx" ON "health_daily_logs" USING btree ("workspace_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_workspace_id_date_idx" ON "journal" USING btree ("workspace_id","date");
