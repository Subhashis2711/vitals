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
    .orderBy(asc(goals.position), asc(goals.createdAt));
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

export async function getGoalByReference(reference: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.reference, reference.toUpperCase()), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)));
  if (!row) return null;
  const [result] = await withProgress([row], workspaceId);
  return result;
}

export async function listGoalTodos(goalId: string, userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(todos)
    .where(and(eq(todos.goalId, goalId), eq(todos.userId, userId), eq(todos.workspaceId, workspaceId)))
    .orderBy(asc(todos.position), asc(todos.createdAt));
}

export async function listGoalsByProjectId(projectId: string, userId: string, workspaceId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.projectId, projectId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
    .orderBy(asc(goals.position), asc(goals.createdAt));
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
  if (position === undefined) {
    const [last] = await db
      .select({ position: goals.position })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)))
      .orderBy(desc(goals.position))
      .limit(1);
    position = last ? last.position + 1 : 0;
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

// The caller chooses adjacent goals from the currently displayed scope
// (all goals, a project, or a topic). Swapping their positions preserves that
// visible order without coupling the repository to a particular screen.
export async function swapGoalPositions(firstId: string, secondId: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [a] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, firstId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)));
  const [b] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, secondId), eq(goals.userId, userId), eq(goals.workspaceId, workspaceId)));
  if (!a || !b) return null;

  // Older rows predate manual goal ordering and can all have position 0.
  // A literal swap would be a no-op in that case, so give the moved goal a
  // neighbouring position based on the stable creation-order fallback.
  if (a.position === b.position) {
    const aComesFirst = a.createdAt.getTime() < b.createdAt.getTime() ||
      (a.createdAt.getTime() === b.createdAt.getTime() && a.id < b.id);
    const [updatedA] = await db
      .update(goals)
      .set({ position: a.position + (aComesFirst ? 1 : -1), updatedAt: new Date() })
      .where(eq(goals.id, a.id))
      .returning();
    return withProgress([updatedA, b], workspaceId);
  }

  const [updatedA] = await db
    .update(goals)
    .set({ position: b.position, updatedAt: new Date() })
    .where(eq(goals.id, a.id))
    .returning();
  const [updatedB] = await db
    .update(goals)
    .set({ position: a.position, updatedAt: new Date() })
    .where(eq(goals.id, b.id))
    .returning();
  return withProgress([updatedA, updatedB], workspaceId);
}
