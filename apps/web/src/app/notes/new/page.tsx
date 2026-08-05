import { NoteEditor } from "@/components/NoteEditor";
import { PageHeader } from "@/components/PageHeader";
import { getProjects } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function NewNotePage() {
  const { projects } = await getProjects();
  return (
    <div>
      <PageHeader title="New note" subtitle={friendlyDate()} />
      <NoteEditor mode="create" projects={projects} />
    </div>
  );
}
