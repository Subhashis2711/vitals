import type { Note } from "@vitals/shared";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NoteDetailClient } from "@/components/NoteDetailClient";
import { PageHeader } from "@/components/PageHeader";
import { getNote, getProjects, getTodosBySourceNote } from "@/lib/api";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Next.js doesn't decode a %2F inside a dynamic segment back into a
  // literal "/", so a GID (brain/note/<uuid>) arrives here still encoded.
  const id = decodeURIComponent(rawId);

  let note: Note;
  try {
    ({ note } = await getNote(id));
  } catch {
    notFound();
  }

  const [{ projects }, { todos }] = await Promise.all([getProjects(), getTodosBySourceNote(note.id)]);

  return (
    <div>
      <PageHeader title={note.title ?? "Untitled"} subtitle="Note" />
      <Link href="/notes" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300">
        <ArrowLeft className="h-4 w-4" />
        Back to notes
      </Link>
      <NoteDetailClient note={note} projects={projects} linkedTodos={todos} />
    </div>
  );
}
