import type { CreateGoalInput, UpdateGoalInput } from "@vitals/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { goals, todos } from "../schema";

type GoalRow = typeof goals.$inferSelect;

// Progress is deliberately computed here from linked todos rather than
// accepted as client input — see the schema comment on `goals`.
async function withProgress(rows: GoalRow[], workspaceId: string) {
  const db = getDb();
  const results = [];
  for (const goal of rows) {
    const linked = await db
      .select()
      .from(todos)
      .where(and(eq(todos.goalId, goal.id), eq(todos.workspaceId, workspaceId)));
    const todoCount = linked.length;
    const doneTodoCount = linked.filter((t) => t.status === "done").length;
    const progress = todoCount > 0 ? Math.round((doneTodoCount / todoCount) * 100) : 0;
    results.push({ ...goal, progress, todoCount, doneTodoCount });
  }
  return results;
}

export async function listGoals(userId: string, workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .orderBy(desc(goals.createdAt));
  return withProgress(rows, workspaceId);
}

export async function getGoalById(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)));
  if (!row) return null;
  const [withProg] = await withProgress([row], workspaceId);
  return withProg;
}

export async function listGoalTodos(goalId: string, userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(todos)
    .where(and(eq(todos.goalId, goalId), eq(todos.userId, userId), eq(todos.workspaceId, workspaceId)));
}

export async function listGoalsByProjectId(projectId: string, userId: string, workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.projectId, projectId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .orderBy(desc(goals.createdAt));
  return withProgress(rows, workspaceId);
}

// Former "roadmap" goals — position-ordered, like todos within a status
// column, since a topic's roadmap is a deliberately ordered list of steps.
export async function listGoalsByTopicId(topicId: string, userId: string, workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.topicId, topicId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .orderBy(asc(goals.position));
  return withProgress(rows, workspaceId);
}

export async function createGoal(input: CreateGoalInput, userId: string, workspaceId: string) {
  const db = getDb();
  let position = input.position;
  if (position === undefined && input.topicId) {
    const existing = await db
      .select()
      .from(goals)
      .where(and(eq(goals.topicId, input.topicId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)));
    position = existing.length;
  }
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      workspaceId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      projectId: input.projectId ?? null,
      topicId: input.topicId ?? null,
      position: position ?? 0,
    })
    .returning();
  const [withProg] = await withProgress([row], workspaceId);
  return withProg;
}

export async function updateGoal(id: string, input: UpdateGoalInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .update(goals)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.topicId !== undefined ? { topicId: input.topicId } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .returning();
  if (!row) return null;
  const [withProg] = await withProgress([row], workspaceId);
  return withProg;
}

export async function deleteGoal(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}
