import { PageHeader } from "@/components/PageHeader";
import { WeekCalendar } from "@/components/WeekCalendar";
import { getCalendarEvents } from "@/lib/api";
import { friendlyDate, getWeekDates, toISODate } from "@/lib/date";

export default async function CalendarPage() {
  const weekDateStrings = getWeekDates(new Date()).map(toISODate);
  const { events } = await getCalendarEvents(weekDateStrings);

  return (
    <div>
      <PageHeader title="Calendar" subtitle={friendlyDate()} />
      <WeekCalendar initialWeekStart={weekDateStrings[0]} initialEvents={events} />
    </div>
  );
}
