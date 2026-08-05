import type { UpsertJournalEntryInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { journal, notes } from "../schema";

type JoinedRow = { journal: typeof journal.$inferSelect; notes: typeof notes.$inferSelect };

function toJournalEntry({ journal: j, notes: note }: JoinedRow) {
  return {
    id: j.id,
    date: j.date,
    noteId: j.noteId,
    content: note.content,
    createdAt: j.createdAt,
    updatedAt: note.updatedAt,
  };
}

export async function listJournalEntries(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(journal)
    .innerJoin(notes, eq(journal.noteId, notes.id))
    .where(eq(journal.userId, userId))
    .orderBy(desc(journal.date));
  return rows.map(toJournalEntry);
}

export async function getJournalEntryByDate(date: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(journal)
    .innerJoin(notes, eq(journal.noteId, notes.id))
    .where(and(eq(journal.date, date), eq(journal.userId, userId)));
  return row ? toJournalEntry(row) : null;
}

// Upserts by date — one entry per calendar day. The first save for a date
// creates both a journal row and its linked note; later saves on the same
// date just update the note's content.
export async function upsertJournalEntry(input: UpsertJournalEntryInput, userId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(journal)
    .where(and(eq(journal.date, input.date), eq(journal.userId, userId)));

  if (existing) {
    const [note] = await db
      .update(notes)
      .set({ content: input.content, rawContent: input.content, updatedAt: new Date() })
      .where(eq(notes.id, existing.noteId))
      .returning();
    return toJournalEntry({ journal: existing, notes: note });
  }

  const [note] = await db
    .insert(notes)
    .values({ userId, title: null, content: input.content, rawContent: input.content, domain: "journal" })
    .returning();
  const [row] = await db.insert(journal).values({ userId, date: input.date, noteId: note.id }).returning();
  return toJournalEntry({ journal: row, notes: note });
}

// Deletes the journal row and its linked note together — the FK cascade
// only fires note -> journal, not the reverse, so the note needs an
// explicit delete here or it'd be orphaned.
export async function deleteJournalEntry(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(journal)
    .where(and(eq(journal.id, id), eq(journal.userId, userId)))
    .returning();
  if (!row) return null;
  const [note] = await db.delete(notes).where(eq(notes.id, row.noteId)).returning();
  return toJournalEntry({ journal: row, notes: note });
}
