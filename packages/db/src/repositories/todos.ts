import type { CreateTodoInput, TodoStatus, UpdateTodoInput } from "@vitals/shared";
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
      position,
    })
    .returning();
  return row;
}

export async function updateTodo(id: string, input: UpdateTodoInput, userId: string) {
  const db = getDb();

  // Moving to a different status column: drop it at the end of that column
  // rather than keeping a position value that was only meaningful in the
  // old column.
  let positionPatch: { position: number } | Record<string, never> = {};
  if (input.status !== undefined) {
    const [existing] = await db.select().from(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
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
      ...positionPatch,
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();
  return row ?? null;
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
