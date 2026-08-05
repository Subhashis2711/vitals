export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function friendlyDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function toISODate(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(anchor: Date): Date[] {
  const monday = getMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
