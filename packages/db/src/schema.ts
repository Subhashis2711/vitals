import { randomUUID } from "node:crypto";
import {
  GOAL_STATUSES,
  HABIT_FREQUENCIES,
  NOTE_CONTENT_TYPES,
  NOTE_DOMAINS,
  RECURRENCE_FREQS,
  TEMPLATE_TYPES,
  TODO_SOURCES,
  TODO_STATUSES,
} from "@vitals/shared";
import {
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const todoStatusEnum = pgEnum("todo_status", TODO_STATUSES);
export const todoSourceEnum = pgEnum("todo_source", TODO_SOURCES);
export const noteContentTypeEnum = pgEnum("note_content_type", NOTE_CONTENT_TYPES);
export const noteDomainEnum = pgEnum("note_domain", NOTE_DOMAINS);
export const templateTypeEnum = pgEnum("template_type", TEMPLATE_TYPES);
export const goalStatusEnum = pgEnum("goal_status", GOAL_STATUSES);
export const recurrenceFreqEnum = pgEnum("recurrence_freq", RECURRENCE_FREQS);
export const habitFrequencyEnum = pgEnum("habit_frequency", HABIT_FREQUENCIES);

// Supabase-managed table — declared here only so every other table can FK
// against it. Supabase owns auth.users' own schema/migrations; we never
// create or alter it ourselves.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// A private, isolated context per user — "Personal", "Work", etc. Every
// other table's rows belong to exactly one workspace (workspaceId below);
// workspaces themselves are never shared between users (see the "private
// only" decision in the workspace-switcher feature), so validating a
// workspace belongs to the requesting user is enough to fully isolate its
// data — see apps/api/src/plugins/workspace.ts.
export const workspaces = pgTable("workspaces", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Manual ordering for the workspace switcher — lower shows first.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Goal progress is deliberately not a manually-typed field — it's computed
// from linked todos (done / total) by the goals repository. Status matches
// TODO_STATUSES (todo/in_progress/done) rather than a separate risk-based
// enum, for consistency with todos.
export const goals = pgTable("goals", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: goalStatusEnum("status").notNull().default("todo"),
  startDate: text("start_date"),
  targetDate: text("target_date"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  // A goal optionally belongs to a project *or* a learning topic (roadmap
  // items live here now, scoped by topicId) — real FK, unlike notes.domainId
  // below, since a goal only ever has these two possible parents.
  topicId: uuid("topic_id").references(() => learningTopics.id, { onDelete: "set null" }),
  // Manual ordering, same shape as todos.position — used for topic-scoped
  // (former roadmap) goals; general goals don't rely on it.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// `domain` classifies what a note is about; `domainId` points at the parent
// row for "project"/"learning" domains. There's deliberately no FK on
// domainId — Postgres can't declare one that conditionally targets
// `projects` or `learningTopics` — so callers that delete a project or
// topic must explicitly clean up matching notes (see repositories/projects.ts
// and repositories/learning.ts). "journal" notes are pointed at by a
// `journal` row instead (date -> noteId), so domainId is unused for them.
export const notes = pgTable("notes", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content").notNull(),
  rawContent: text("raw_content").notNull(),
  contentType: noteContentTypeEnum("content_type").notNull().default("paste"),
  domain: noteDomainEnum("domain").notNull().default("project"),
  domainId: uuid("domain_id"),
  sourceUrl: text("source_url"),
  aiSummary: text("ai_summary"),
  tags: text("tags").array().notNull().default([]),
  // Placeholder for a future embedding vector (semantic search). Left as
  // plain jsonb for now so we don't need a vector extension yet; swap to
  // a proper vector column when semantic search is implemented.
  embedding: jsonb("embedding").$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: todoStatusEnum("status").notNull().default("todo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  source: todoSourceEnum("source").notNull().default("manual"),
  sourceNoteId: uuid("source_note_id").references(() => notes.id, { onDelete: "set null" }),
  tags: text("tags").array().notNull().default([]),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  // Manual ordering within a status column (lower = shown first). Scoped per
  // status, not global — moving between columns reassigns it to the end of
  // the new column. See repositories/todos.ts.
  position: integer("position").notNull().default(0),
  // Recurrence is opt-in (null = one-off, the default). recurrenceDaysOfWeek
  // only applies to "weekly" — repeat on specific weekdays (0=Sun..6=Sat)
  // instead of every 7 days from the due date. Completing a recurring todo
  // spawns the next occurrence as a new row rather than mutating this one —
  // see repositories/todos.ts.
  recurrenceFreq: recurrenceFreqEnum("recurrence_freq"),
  recurrenceDaysOfWeek: integer("recurrence_days_of_week").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: templateTypeEnum("type").notNull(),
  promptUsed: text("prompt_used").notNull(),
  fields: jsonb("fields").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const habits = pgTable("habits", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  // "daily" (default) expects a check-in every day. "weekly" pairs with
  // daysOfWeek (0=Sun..6=Sat) to expect check-ins only on specific weekdays.
  // "monthly" expects one check-in per calendar month — the tracker shows a
  // single indicator for it instead of a daily grid, see HabitTracker.tsx.
  frequency: habitFrequencyEnum("frequency").notNull().default("daily"),
  daysOfWeek: integer("days_of_week").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per (habit, day) a habit was marked done. Date is stored as a
// plain "YYYY-MM-DD" string — habits are tracked per calendar day, not per
// timestamp, so we deliberately avoid timezone-aware timestamp math here.
export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    habitDateIdx: uniqueIndex("habit_logs_habit_id_date_idx").on(table.habitId, table.date),
  }),
);

// Lightweight week-view time blocks. Deliberately separate from todos —
// a calendar block is "when", a todo is "what"; todoId optionally links the
// two so a block can represent time set aside for a specific todo.
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  color: text("color"),
  todoId: uuid("todo_id").references(() => todos.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningTopics = pgTable("learning_topics", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  lastTouchedAt: timestamp("last_touched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Roadmap items and insights used to live here as their own tables — they're
// now goals (scoped via goals.topicId) and notes (domain: "learning",
// domainId: topicId) respectively, see repositories/learning.ts.

export const learningResources = pgTable("learning_resources", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => learningTopics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Maps a calendar day to the note that carries its content (domain:
// "journal") — kept as its own addressable row instead of folding date/
// content directly into notes, so a journal entry stays a distinct object
// while reusing notes for the actual title/content/tags storage.
export const journal = pgTable(
  "journal",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Scoped per workspace, not per user — the same user could otherwise
    // collide across two of their own workspaces journaling the same day.
    dateIdx: uniqueIndex("journal_workspace_id_date_idx").on(table.workspaceId, table.date),
  }),
);

// One row per day, upserted — steps/sleep/weight/water are all optional so
// the UI can honestly show "—" instead of a fake 0 for anything unlogged.
export const healthDailyLogs = pgTable(
  "health_daily_logs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    steps: integer("steps"),
    sleepHours: doublePrecision("sleep_hours"),
    weightKg: doublePrecision("weight_kg"),
    waterCups: integer("water_cups").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Scoped per workspace, not per user — see journal's dateIdx above.
    dateIdx: uniqueIndex("health_daily_logs_workspace_id_date_idx").on(table.workspaceId, table.date),
  }),
);

export const healthActivityLogs = pgTable("health_activity_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  sport: text("sport").notNull(),
  durationMin: integer("duration_min").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// amount is signed: positive = income, negative = expense.
export const transactions = pgTable("transactions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per completed focus interval — the countdown itself lives entirely
// client-side (packages/shared doesn't need to model "running" state); this
// table only records history, so stats/history survive a page reload.
// todoId is optional — a session can stand alone (label carries context
// instead) or be tied to the task it was spent on.
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  todoId: uuid("todo_id").references(() => todos.id, { onDelete: "set null" }),
  label: text("label"),
  durationMin: integer("duration_min").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
