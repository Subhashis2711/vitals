import { z } from "zod";
import { GOAL_STATUSES, NOTE_CONTENT_TYPES, NOTE_DOMAINS, TEMPLATE_TYPES, TODO_SOURCES, TODO_STATUSES } from "./enums";
import { gidSchema } from "./gid";

// --- Entities (mirror the DB shape returned by the API) ---
// id/FK fields are Shopify-style GIDs (`brain/<type>/<uuid>`) as returned by
// the API — see gid.ts. They're plain `z.string()`, not `.uuid()`, since a
// GID isn't uuid-shaped; the raw uuid only exists in packages/db.

export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(TODO_STATUSES),
  dueDate: z.string().nullable(),
  source: z.enum(TODO_SOURCES),
  sourceNoteId: z.string().nullable(),
  tags: z.array(z.string()),
  projectId: z.string().nullable(),
  goalId: z.string().nullable(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Todo = z.infer<typeof todoSchema>;

export const noteSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  rawContent: z.string(),
  contentType: z.enum(NOTE_CONTENT_TYPES),
  domain: z.enum(NOTE_DOMAINS),
  // GID of the projects/learningTopics row this note belongs to; unused
  // (null) for domain "journal" — see the `journal` table instead.
  domainId: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  aiSummary: z.string().nullable(),
  tags: z.array(z.string()),
  // Placeholder for future embedding vector support — unused for now.
  embedding: z.array(z.number()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

export const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(TEMPLATE_TYPES),
  promptUsed: z.string(),
  fields: z.unknown(),
  createdAt: z.string(),
});
export type Template = z.infer<typeof templateSchema>;

// --- Todos API payloads ---

export const createTodoInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(TODO_STATUSES).optional(),
  dueDate: z.string().nullable().optional(),
  source: z.enum(TODO_SOURCES).optional(),
  sourceNoteId: gidSchema("note").nullable().optional(),
  tags: z.array(z.string()).optional(),
  projectId: gidSchema("project").nullable().optional(),
  goalId: gidSchema("goal").nullable().optional(),
});
export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

export const updateTodoInputSchema = createTodoInputSchema.partial();
export type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

// Swaps the `position` of two todos — used for the up/down reorder controls.
export const reorderTodosInputSchema = z.object({
  firstId: gidSchema("todo"),
  secondId: gidSchema("todo"),
});
export type ReorderTodosInput = z.infer<typeof reorderTodosInputSchema>;

// --- Notes API payloads ---
// `domainId` is validated against the matching resource type for `domain`
// (project/learning) in the notes route handler, not here — Zod can't easily
// pick a gidSchema(...) based on a sibling field's value.

export const createNoteInputSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string(),
  rawContent: z.string().optional(),
  contentType: z.enum(NOTE_CONTENT_TYPES).optional(),
  domain: z.enum(NOTE_DOMAINS).optional(),
  domainId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

export const updateNoteInputSchema = createNoteInputSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

export const captureNoteRequestSchema = z.object({
  rawContent: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
});
export type CaptureNoteRequest = z.infer<typeof captureNoteRequestSchema>;

export const captureNoteResponseSchema = z.object({
  note: noteSchema,
  todos: z.array(todoSchema),
});
export type CaptureNoteResponse = z.infer<typeof captureNoteResponseSchema>;

// --- Markdown API payloads ---

export const markdownToTextRequestSchema = z.object({
  markdown: z.string(),
});
export type MarkdownToTextRequest = z.infer<typeof markdownToTextRequestSchema>;

export const markdownToTextResponseSchema = z.object({
  text: z.string(),
});
export type MarkdownToTextResponse = z.infer<typeof markdownToTextResponseSchema>;

export const markdownFromTextRequestSchema = z.object({
  text: z.string(),
});
export type MarkdownFromTextRequest = z.infer<typeof markdownFromTextRequestSchema>;

export const markdownFromTextResponseSchema = z.object({
  markdown: z.string(),
});
export type MarkdownFromTextResponse = z.infer<typeof markdownFromTextResponseSchema>;

// --- Projects ---

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = createProjectInputSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

// --- Habits ---

export const habitSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  createdAt: z.string(),
});
export type Habit = z.infer<typeof habitSchema>;

export const createHabitInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});
export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;

// Dates are plain "YYYY-MM-DD" strings — habits are tracked per calendar day.
export const habitLogSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  date: z.string(),
  createdAt: z.string(),
});
export type HabitLog = z.infer<typeof habitLogSchema>;

export const toggleHabitLogInputSchema = z.object({
  date: z.string().optional(),
});
export type ToggleHabitLogInput = z.infer<typeof toggleHabitLogInputSchema>;

export const toggleHabitLogResponseSchema = z.object({
  logged: z.boolean(),
  log: habitLogSchema.nullable(),
});
export type ToggleHabitLogResponse = z.infer<typeof toggleHabitLogResponseSchema>;

// --- Goals ---
// progress is server-computed (done linked todos / total linked todos), never
// client-supplied — see packages/db/src/repositories/goals.ts.

export const goalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(GOAL_STATUSES),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  projectId: z.string().nullable(),
  topicId: z.string().nullable(),
  position: z.number(),
  progress: z.number().min(0).max(100),
  todoCount: z.number(),
  doneTodoCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Goal = z.infer<typeof goalSchema>;

export const createGoalInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  projectId: gidSchema("project").nullable().optional(),
  topicId: gidSchema("learning").nullable().optional(),
  position: z.number().optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const updateGoalInputSchema = createGoalInputSchema.partial();
export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

// --- Calendar ---

export const calendarEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  color: z.string().nullable(),
  todoId: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const createCalendarEventInputSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  color: z.string().nullable().optional(),
  todoId: z.string().uuid().nullable().optional(),
});
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventInputSchema>;

export const updateCalendarEventInputSchema = createCalendarEventInputSchema.partial();
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventInputSchema>;

// --- Learning ---
// Roadmap items are goals scoped to a topic (goals.topicId) and insights are
// notes scoped to a topic (domain: "learning", domainId: topicId) — see
// packages/db/src/repositories/learning.ts. Only topics and resources are
// still their own tables.

export const learningTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  lastTouchedAt: z.string(),
  createdAt: z.string(),
});
export type LearningTopic = z.infer<typeof learningTopicSchema>;

export const createLearningTopicInputSchema = z.object({
  title: z.string().min(1),
});
export type CreateLearningTopicInput = z.infer<typeof createLearningTopicInputSchema>;

export const learningResourceSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  createdAt: z.string(),
});
export type LearningResource = z.infer<typeof learningResourceSchema>;

export const createLearningResourceInputSchema = z.object({
  name: z.string().min(1),
  url: z.string().nullable().optional(),
});
export type CreateLearningResourceInput = z.infer<typeof createLearningResourceInputSchema>;

export const learningTopicDetailSchema = z.object({
  topic: learningTopicSchema,
  roadmap: z.array(goalSchema),
  resources: z.array(learningResourceSchema),
  insights: z.array(noteSchema),
});
export type LearningTopicDetail = z.infer<typeof learningTopicDetailSchema>;

// --- Journal ---
// A thin view over the `journal` table joined to its linked note (domain:
// "journal") — see packages/db/src/repositories/journal.ts. `id` is the
// journal row's id; `content`/`updatedAt` come from the linked note.

export const journalEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  noteId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const upsertJournalEntryInputSchema = z.object({
  date: z.string(),
  content: z.string(),
});
export type UpsertJournalEntryInput = z.infer<typeof upsertJournalEntryInputSchema>;

// --- Health ---

export const healthDailyLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  steps: z.number().nullable(),
  sleepHours: z.number().nullable(),
  weightKg: z.number().nullable(),
  waterCups: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HealthDailyLog = z.infer<typeof healthDailyLogSchema>;

export const upsertHealthDailyLogInputSchema = z.object({
  date: z.string(),
  steps: z.number().nullable().optional(),
  sleepHours: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  waterCups: z.number().optional(),
});
export type UpsertHealthDailyLogInput = z.infer<typeof upsertHealthDailyLogInputSchema>;

export const healthActivityLogSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  sport: z.string(),
  durationMin: z.number(),
  createdAt: z.string(),
});
export type HealthActivityLog = z.infer<typeof healthActivityLogSchema>;

export const createHealthActivityLogInputSchema = z.object({
  date: z.string(),
  sport: z.string().min(1),
  durationMin: z.number().min(1),
});
export type CreateHealthActivityLogInput = z.infer<typeof createHealthActivityLogInputSchema>;

// --- Money ---

export const transactionSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amount: z.number(),
  category: z.string().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  category: z.string().nullable().optional(),
  occurredAt: z.string(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const savingsGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  createdAt: z.string(),
});
export type SavingsGoal = z.infer<typeof savingsGoalSchema>;

export const createSavingsGoalInputSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  currentAmount: z.number().min(0).optional(),
});
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalInputSchema>;

export const updateSavingsGoalInputSchema = createSavingsGoalInputSchema.partial();
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalInputSchema>;
