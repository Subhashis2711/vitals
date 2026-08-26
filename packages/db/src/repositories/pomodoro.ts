import type { CreatePomodoroSessionInput } from "@vitals/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../client";
import { pomodoroSessions } from "../schema";

export async function listPomodoroSessions(userId: string, workspaceId: string, since?: string) {
  const db = getDb();
  const base = and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.workspaceId, workspaceId));
  return db
    .select()
    .from(pomodoroSessions)
    .where(since ? and(base, gte(pomodoroSessions.completedAt, new Date(since))) : base)
    .orderBy(desc(pomodoroSessions.completedAt));
}

export async function listPomodoroSessionsByTodoId(todoId: string, userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.todoId, todoId), eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.workspaceId, workspaceId)))
    .orderBy(desc(pomodoroSessions.completedAt));
}

export async function createPomodoroSession(input: CreatePomodoroSessionInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .insert(pomodoroSessions)
    .values({
      userId,
      workspaceId,
      todoId: input.todoId ?? null,
      label: input.label ?? null,
      durationMin: input.durationMin,
      startedAt: new Date(input.startedAt),
      completedAt: new Date(input.completedAt),
    })
    .returning();
  return row;
}

export async function deletePomodoroSession(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .delete(pomodoroSessions)
    .where(and(eq(pomodoroSessions.id, id), eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}
