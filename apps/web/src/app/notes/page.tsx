import { Plus } from "lucide-react";
import Link from "next/link";
import { NoteList } from "@/components/NoteList";
import { PageHeader } from "@/components/PageHeader";
import { getNotes, getProjects } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function NotesPage() {
  const [{ notes }, { projects }] = await Promise.all([getNotes(), getProjects()]);

  return (
    <div>
      <PageHeader title="Notes" subtitle={friendlyDate()} />
      <div className="mb-4 flex justify-end">
        <Link
          href="/notes/new"
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          New note
        </Link>
      </div>
      <NoteList initialNotes={notes} projects={projects} />
    </div>
  );
}
