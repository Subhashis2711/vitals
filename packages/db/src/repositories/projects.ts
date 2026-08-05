import type { CreateProjectInput, UpdateProjectInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { projects } from "../schema";
import { deleteNotesByDomain } from "./notes";

export async function listProjects(userId: string) {
  const db = getDb();
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  return row ?? null;
}

export async function createProject(input: CreateProjectInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(projects)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
    })
    .returning();
  return row;
}

export async function updateProject(id: string, input: UpdateProjectInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();
  return row ?? null;
}

// domainId has no DB-level FK (see schema.ts comment on notes), so deleting
// a project must explicitly clean up notes pointing at it via domainId.
export async function deleteProject(id: string, userId: string) {
  const db = getDb();
  await deleteNotesByDomain("project", id, userId);
  const [row] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();
  return row ?? null;
}
