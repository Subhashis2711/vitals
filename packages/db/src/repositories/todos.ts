import type { CreateTodoInput, RecurrenceFreq, TodoStatus, UpdateTodoInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { todos } from "../schema";

export async function listTodos(userId: string) {
  const db = getDb();
  return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt));
}

export async function getTodoById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
  return row ?? null;
}

export async function listTodosBySourceNoteId(sourceNoteId: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(todos)
    .where(and(eq(todos.sourceNoteId, sourceNoteId), eq(todos.userId, userId)))
    .orderBy(desc(todos.createdAt));
}

export async function listTodosByProjectId(projectId: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(todos)
    .where(and(eq(todos.projectId, projectId), eq(todos.userId, userId)))
    .orderBy(desc(todos.createdAt));
}

async function nextPositionForStatus(status: TodoStatus, userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ position: todos.position })
    .from(todos)
    .where(and(eq(todos.status, status), eq(todos.userId, userId)))
    .orderBy(desc(todos.position))
    .limit(1);
  return row ? row.position + 1 : 0;
}

function addUTCDays(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

// Clamps the day to the last valid day of the target month — e.g. Jan 31 +
// 1 month lands on Feb 28/29, not spilling over into March.
function clampToUTCMonth(year: number, monthIndex0: number, day: number): Date {
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex0, Math.min(day, daysInMonth)));
}

// All-UTC date math — dueDate is stored as a UTC-midnight timestamp (see
// createTodo/updateTodo below), so computing "next occurrence" in the
// server's local timezone would shift the result by a day whenever that
// timezone isn't UTC.
export function nextOccurrence(from: Date, freq: RecurrenceFreq, daysOfWeek?: number[] | null): Date {
  if (freq === "daily") return addUTCDays(from, 1);
  if (freq === "weekly") {
    if (daysOfWeek && daysOfWeek.length > 0) {
      let candidate = addUTCDays(from, 1);
      for (let i = 0; i < 7; i++) {
        if (daysOfWeek.includes(candidate.getUTCDay())) return candidate;
        candidate = addUTCDays(candidate, 1);
      }
    }
    return addUTCDays(from, 7);
  }
  if (freq === "monthly") return clampToUTCMonth(from.getUTCFullYear(), from.getUTCMonth() + 1, from.getUTCDate());
  return clampToUTCMonth(from.getUTCFullYear() + 1, from.getUTCMonth(), from.getUTCDate());
}

export async function createTodo(input: CreateTodoInput, userId: string) {
  const db = getDb();
  const status = input.status ?? "todo";
  const position = await nextPositionForStatus(status, userId);
  const [row] = await db
    .insert(todos)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      status,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      source: input.source ?? "manual",
      sourceNoteId: input.sourceNoteId ?? null,
      tags: input.tags ?? [],
      projectId: input.projectId ?? null,
      goalId: input.goalId ?? null,
      recurrenceFreq: input.recurrenceFreq ?? null,
      recurrenceDaysOfWeek: input.recurrenceDaysOfWeek ?? null,
      position,
    })
    .returning();
  return row;
}

// Returns the updated row, plus `nextTodo` when completing a recurring todo
// spawned its next occurrence as a brand-new row (see nextOccurrence above)
// — the original stays marked done so completion history is preserved.
export async function updateTodo(id: string, input: UpdateTodoInput, userId: string) {
  const db = getDb();

  // Moving to a different status column: drop it at the end of that column
  // rather than keeping a position value that was only meaningful in the
  // old column. Also doubles as the "was this a recurring todo" lookup below.
  let positionPatch: { position: number } | Record<string, never> = {};
  let existing: typeof todos.$inferSelect | undefined;
  if (input.status !== undefined) {
    [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
    if (existing && existing.status !== input.status) {
      positionPatch = { position: await nextPositionForStatus(input.status, userId) };
    }
  }

  const [row] = await db
    .update(todos)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(input.dueDate) : null } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.sourceNoteId !== undefined ? { sourceNoteId: input.sourceNoteId } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.goalId !== undefined ? { goalId: input.goalId } : {}),
      ...(input.recurrenceFreq !== undefined ? { recurrenceFreq: input.recurrenceFreq } : {}),
      ...(input.recurrenceDaysOfWeek !== undefined ? { recurrenceDaysOfWeek: input.recurrenceDaysOfWeek } : {}),
      ...positionPatch,
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();

  if (!row) return null;

  let nextTodo = null;
  if (input.status === "done" && existing?.recurrenceFreq) {
    const nextDueDate = nextOccurrence(row.dueDate ?? new Date(), existing.recurrenceFreq, existing.recurrenceDaysOfWeek);
    const position = await nextPositionForStatus("todo", userId);
    [nextTodo] = await db
      .insert(todos)
      .values({
        userId,
        title: row.title,
        description: row.description,
        status: "todo",
        dueDate: nextDueDate,
        source: row.source,
        sourceNoteId: row.sourceNoteId,
        tags: row.tags,
        projectId: row.projectId,
        goalId: row.goalId,
        recurrenceFreq: row.recurrenceFreq,
        recurrenceDaysOfWeek: row.recurrenceDaysOfWeek,
        position,
      })
      .returning();
  }

  return { todo: row, nextTodo };
}

// Swaps the `position` of two todos — powers the up/down reorder controls.
// The caller (frontend) decides which two ids are "adjacent" based on what's
// currently displayed, so this stays a dumb, predictable swap.
export async function swapTodoPositions(firstId: string, secondId: string, userId: string) {
  const db = getDb();
  const [a] = await db.select().from(todos).where(and(eq(todos.id, firstId), eq(todos.userId, userId)));
  const [b] = await db.select().from(todos).where(and(eq(todos.id, secondId), eq(todos.userId, userId)));
  if (!a || !b) return null;

  const [updatedA] = await db
    .update(todos)
    .set({ position: b.position, updatedAt: new Date() })
    .where(eq(todos.id, a.id))
    .returning();
  const [updatedB] = await db
    .update(todos)
    .set({ position: a.position, updatedAt: new Date() })
    .where(eq(todos.id, b.id))
    .returning();
  return [updatedA, updatedB] as const;
}

export async function deleteTodo(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();
  return row ?? null;
}
