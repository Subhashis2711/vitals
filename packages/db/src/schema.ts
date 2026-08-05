import { randomUUID } from "node:crypto";
import {
  GOAL_STATUSES,
  NOTE_CONTENT_TYPES,
  NOTE_DOMAINS,
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

// Supabase-managed table — declared here only so every other table can FK
// against it. Supabase owns auth.users' own schema/migrations; we never
// create or alter it ourselves.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const projects = pgTable("projects", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
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
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
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
    date: text("date").notNull(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Was unique on date alone — two different users logging the same
    // calendar day would otherwise collide.
    dateIdx: uniqueIndex("journal_user_id_date_idx").on(table.userId, table.date),
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
    date: text("date").notNull(),
    steps: integer("steps"),
    sleepHours: doublePrecision("sleep_hours"),
    weightKg: doublePrecision("weight_kg"),
    waterCups: integer("water_cups").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Was unique on date alone — two different users logging the same
    // calendar day would otherwise collide.
    dateIdx: uniqueIndex("health_daily_logs_user_id_date_idx").on(table.userId, table.date),
  }),
);

export const healthActivityLogs = pgTable("health_activity_logs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
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
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
