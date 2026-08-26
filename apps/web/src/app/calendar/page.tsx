import { PageHeader } from "@/components/PageHeader";
import { WeekCalendar } from "@/components/WeekCalendar";
import { getCalendarEvents, getTodos } from "@/lib/api";
import { friendlyDate, getWeekDates, toISODate } from "@/lib/date";

export default async function CalendarPage() {
  const weekDateStrings = getWeekDates(new Date()).map(toISODate);
  const [{ events }, { todos }] = await Promise.all([getCalendarEvents(weekDateStrings), getTodos()]);

  return (
    <div>
      <PageHeader title="Calendar" subtitle={friendlyDate()} />
      <WeekCalendar initialWeekStart={weekDateStrings[0]} initialEvents={events} initialTodos={todos} />
    </div>
  );
}
