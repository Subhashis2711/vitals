import { JournalEditor } from "@/components/JournalEditor";
import { PageHeader } from "@/components/PageHeader";
import { getJournalEntries } from "@/lib/api";
import { friendlyDate, todayISO } from "@/lib/date";

export default async function JournalPage() {
  const { entries } = await getJournalEntries();
  const today = todayISO();
  const todayEntry = entries.find((e) => e.date === today) ?? null;

  return (
    <div>
      <PageHeader title="Journal" subtitle={friendlyDate()} />
      <JournalEditor initialEntries={entries} todayEntry={todayEntry} />
    </div>
  );
}
