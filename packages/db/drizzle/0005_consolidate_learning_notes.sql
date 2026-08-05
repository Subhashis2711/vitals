CREATE TYPE "public"."note_domain" AS ENUM('project', 'learning', 'journal');--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "domain" "note_domain" DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
UPDATE "notes" SET "domain_id" = "project_id";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_topic_id_learning_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."learning_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" TYPE text USING "status"::text;--> statement-breakpoint
UPDATE "goals" SET "status" = CASE "status" WHEN 'on_track' THEN 'in_progress' WHEN 'at_risk' THEN 'in_progress' WHEN 'off_track' THEN 'todo' ELSE "status" END;--> statement-breakpoint
DROP TYPE "public"."goal_status";--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" TYPE "public"."goal_status" USING "status"::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'todo';--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
CREATE TABLE "journal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"note_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "journal_date_idx" ON "journal" USING btree ("date");--> statement-breakpoint
INSERT INTO "goals" ("id", "title", "description", "status", "start_date", "target_date", "project_id", "topic_id", "position", "created_at", "updated_at")
SELECT gen_random_uuid(), "title", NULL, (CASE WHEN "done" THEN 'done' ELSE 'todo' END)::"public"."goal_status", NULL, NULL, NULL, "topic_id", "position", "created_at", "created_at"
FROM "learning_roadmap_items";--> statement-breakpoint
INSERT INTO "notes" ("id", "title", "content", "raw_content", "content_type", "domain", "domain_id", "tags", "created_at", "updated_at")
SELECT gen_random_uuid(), NULL, "content", "content", 'paste', 'learning', "topic_id", '{}', "created_at", "created_at"
FROM "learning_insights";--> statement-breakpoint
INSERT INTO "notes" ("id", "title", "content", "raw_content", "content_type", "domain", "domain_id", "tags", "created_at", "updated_at")
SELECT "id", NULL, "content", "content", 'paste', 'journal', NULL, '{}', "created_at", "updated_at"
FROM "journal_entries";--> statement-breakpoint
INSERT INTO "journal" ("id", "date", "note_id", "created_at")
SELECT gen_random_uuid(), "date", "id", "created_at"
FROM "journal_entries";--> statement-breakpoint
DROP TABLE "learning_roadmap_items";--> statement-breakpoint
DROP TABLE "learning_insights";--> statement-breakpoint
DROP TABLE "journal_entries";
