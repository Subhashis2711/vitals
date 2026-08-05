import { HabitTracker } from "@/components/HabitTracker";
import { PageHeader } from "@/components/PageHeader";
import { getHabitLogs, getHabits } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

export default async function HabitsPage() {
  const [{ habits }, { logs }] = await Promise.all([getHabits(), getHabitLogs()]);
  return (
    <div>
      <PageHeader title="Habits" subtitle={friendlyDate()} />
      <HabitTracker initialHabits={habits} initialLogs={logs} />
    </div>
  );
}
