import { PageHeader } from "@/components/PageHeader";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { getPomodoroSessions, getTodos } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function FocusPage() {
  const [{ todos }, { sessions }] = await Promise.all([getTodos(), getPomodoroSessions()]);
  const openTodos = todos.filter((t) => t.status !== "done");

  return (
    <div>
      <PageHeader title="Focus" subtitle={friendlyDate()} />
      <PomodoroTimer todos={openTodos} initialSessions={sessions} />
    </div>
  );
}
