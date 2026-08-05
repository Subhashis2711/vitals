CREATE TYPE "public"."note_content_type" AS ENUM('article', 'video', 'paste', 'idea');--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('todo', 'note');--> statement-breakpoint
CREATE TYPE "public"."todo_source" AS ENUM('manual', 'ai_extracted', 'template');--> statement-breakpoint
CREATE TYPE "public"."todo_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"raw_content" text NOT NULL,
	"content_type" "note_content_type" DEFAULT 'paste' NOT NULL,
	"source_url" text,
	"ai_summary" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "template_type" NOT NULL,
	"prompt_used" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "todo_status" DEFAULT 'todo' NOT NULL,
	"due_date" timestamp with time zone,
	"source" "todo_source" DEFAULT 'manual' NOT NULL,
	"source_note_id" uuid,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;