import type { CreateNoteInput, NoteDomain, UpdateNoteInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { notes } from "../schema";

export async function listNotes(userId: string) {
  const db = getDb();
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt));
}

export async function getNoteById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  return row ?? null;
}

// domainId is required for "project"/"learning" (scopes to that parent);
// omitted for "journal" (domainId is unused for journal notes — see the
// `journal` table).
export async function listNotesByDomain(domain: NoteDomain, userId: string, domainId?: string) {
  const db = getDb();
  const where = domainId
    ? and(eq(notes.domain, domain), eq(notes.domainId, domainId), eq(notes.userId, userId))
    : and(eq(notes.domain, domain), eq(notes.userId, userId));
  return db.select().from(notes).where(where).orderBy(desc(notes.createdAt));
}

// Cleans up notes left pointing at a project via domainId — domainId has no
// DB-level FK (see schema.ts comment), so this must be called explicitly by
// deleteProject.
export async function deleteNotesByDomain(domain: NoteDomain, domainId: string, userId: string) {
  const db = getDb();
  return db
    .delete(notes)
    .where(and(eq(notes.domain, domain), eq(notes.domainId, domainId), eq(notes.userId, userId)))
    .returning();
}

export async function createNote(input: CreateNoteInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(notes)
    .values({
      userId,
      title: input.title ?? null,
      content: input.content,
      rawContent: input.rawContent ?? input.content,
      contentType: input.contentType ?? "paste",
      domain: input.domain ?? "project",
      domainId: input.domainId ?? null,
      sourceUrl: input.sourceUrl ?? null,
      aiSummary: input.aiSummary ?? null,
      tags: input.tags ?? [],
    })
    .returning();
  return row;
}

export async function updateNote(id: string, input: UpdateNoteInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .update(notes)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.rawContent !== undefined ? { rawContent: input.rawContent } : {}),
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
      ...(input.domain !== undefined ? { domain: input.domain } : {}),
      ...(input.domainId !== undefined ? { domainId: input.domainId } : {}),
      ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
      ...(input.aiSummary !== undefined ? { aiSummary: input.aiSummary } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteNote(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();
  return row ?? null;
}
