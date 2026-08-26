export const TODO_STATUSES = ["todo", "in_progress", "done"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const TODO_SOURCES = ["manual", "ai_extracted", "template"] as const;
export type TodoSource = (typeof TODO_SOURCES)[number];

export const NOTE_CONTENT_TYPES = ["article", "video", "paste", "idea"] as const;
export type NoteContentType = (typeof NOTE_CONTENT_TYPES)[number];

// What a note is about — orthogonal to contentType (which is about format).
// "journal" notes are pointed at by a `journal` row (date -> noteId) rather
// than carrying a domainId themselves.
export const NOTE_DOMAINS = ["project", "learning", "journal"] as const;
export type NoteDomain = (typeof NOTE_DOMAINS)[number];

export const TEMPLATE_TYPES = ["todo", "note"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

// Matches TODO_STATUSES for consistency — goals no longer track on-track/
// at-risk/off-track risk assessment, just workflow stage.
export const GOAL_STATUSES = ["todo", "in_progress", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// Recurrence for todos. "weekly" pairs with an optional set of weekdays
// (RECURRENCE_DAYS_OF_WEEK below) to repeat on specific days rather than
// every 7 days from the due date.
export const RECURRENCE_FREQS = ["daily", "weekly", "monthly", "yearly"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

// How often a habit is expected — "weekly" pairs with specific weekdays
// (see RECURRENCE_DAYS_OF_WEEK), "monthly" just tracks one check-in per
// calendar month rather than a daily grid.
export const HABIT_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];
