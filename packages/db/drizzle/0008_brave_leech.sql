CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."recurrence_freq" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "frequency" "habit_frequency" DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "days_of_week" integer[];--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "recurrence_freq" "recurrence_freq";--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "recurrence_days_of_week" integer[];