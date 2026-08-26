import type { CreateWorkspaceInput } from "@vitals/shared";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { workspaces } from "../schema";

export async function listWorkspaces(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(asc(workspaces.position), asc(workspaces.createdAt));
}

export async function getWorkspaceById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
  return row ?? null;
}

export async function createWorkspace(input: CreateWorkspaceInput, userId: string) {
  const db = getDb();
  const existing = await listWorkspaces(userId);
  const [row] = await db
    .insert(workspaces)
    .values({ userId, name: input.name, position: existing.length })
    .returning();
  return row;
}

export async function deleteWorkspace(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
    .returning();
  return row ?? null;
}

// Bootstraps a "Personal" workspace on a user's first API call (e.g. right
// after sign-up, before they've ever created one) and otherwise returns
// their default (lowest-position) workspace.
export async function getOrCreateDefaultWorkspace(userId: string) {
  const existing = await listWorkspaces(userId);
  if (existing.length > 0) return existing[0];
  return createWorkspace({ name: "Personal" }, userId);
}
