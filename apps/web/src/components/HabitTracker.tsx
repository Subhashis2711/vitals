"use client";

import type { Habit, HabitFrequency, HabitLog } from "@vitals/shared";
import { Check, Flame, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HabitFrequencyPicker } from "@/components/HabitFrequencyPicker";
import { createHabit, deleteHabit, toggleHabitLog } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

const DAYS_TO_SHOW = 7;

function toLocalDateString(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toLocalDateString(d));
  }
  return dates;
}

function dayLabel(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
    day: String(d.getDate()),
  };
}

// Whether `dateStr` is one of this habit's expected days — "daily" habits
// are scheduled every day; "weekly" habits only on their picked weekdays;
// "monthly" habits aren't tracked per-day at all (see the monthly indicator
// cell in the tracker table instead).
function isScheduledOn(habit: Habit, dateStr: string): boolean {
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekly") {
    const day = new Date(`${dateStr}T00:00:00`).getDay();
    return (habit.daysOfWeek ?? []).includes(day);
  }
  return false;
}

// Counts consecutive *scheduled* days logged, ending today (or yesterday, if
// today is scheduled but isn't logged yet — so the streak doesn't reset to 0
// the moment the day starts). Unscheduled days are skipped without breaking
// the streak, so a weekly Mon/Wed/Fri habit still counts "3 weeks running".
function computeStreak(habit: Habit, dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  const todayStr = toLocalDateString(cursor);
  if (isScheduledOn(habit, todayStr) && !dates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  // ~10 years back is a generous bound so this can't loop forever.
  for (let i = 0; i < 3650; i++) {
    const ds = toLocalDateString(cursor);
    if (isScheduledOn(habit, ds)) {
      if (!dates.has(ds)) break;
      streak += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function HabitTracker({ initialHabits, initialLogs }: { initialHabits: Habit[]; initialLogs: HabitLog[] }) {
  const [habits, setHabits] = useState(initialHabits);
  const [logs, setLogs] = useState(initialLogs);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const visibleHabits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? habits.filter((h) => h.name.toLowerCase().includes(q)) : habits;
  }, [habits, search]);

  const days = useMemo(() => lastNDates(DAYS_TO_SHOW), []);
  const today = toLocalDateString(new Date());

  const logsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!map.has(log.habitId)) map.set(log.habitId, new Set());
      map.get(log.habitId)?.add(log.date);
    }
    return map;
  }, [logs]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { habit } = await createHabit({ name: name.trim(), frequency, daysOfWeek });
      setHabits((prev) => [habit, ...prev]);
      setName("");
      setFrequency("daily");
      setDaysOfWeek(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create habit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, habitName: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habitId !== id));
    await deleteHabit(id);
    toast(`Deleted "${habitName}"`);
  }

  async function handleToggle(habitId: string, date: string) {
    const key = `${habitId}:${date}`;
    setPendingKey(key);
    try {
      const result = await toggleHabitLog(habitId, date);
      setLogs((prev) => {
        const withoutDay = prev.filter((l) => !(l.habitId === habitId && l.date === date));
        return result.logged && result.log ? [...withoutDay, result.log] : withoutDay;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update habit");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New habit..."
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex items-center gap-1 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <HabitFrequencyPicker frequency={frequency} daysOfWeek={daysOfWeek} onChange={(f, d) => { setFrequency(f); setDaysOfWeek(d); }} />
      </form>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search habits..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="p-3 text-left font-medium text-neutral-500">Habit</th>
              {days.map((date) => {
                const { weekday, day } = dayLabel(date);
                return (
                  <th
                    key={date}
                    className={cn(
                      "w-10 p-1 text-center text-xs font-medium text-neutral-500",
                      date === today && "text-cyan-300",
                    )}
                  >
                    <div>{weekday}</div>
                    <div>{day}</div>
                  </th>
                );
              })}
              <th className="w-16 p-3 text-center font-medium text-neutral-500">Streak</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visibleHabits.map((habit) => {
              const habitDates = logsByHabit.get(habit.id) ?? new Set<string>();
              const streak = computeStreak(habit, habitDates);
              const monthPrefix = today.slice(0, 7);
              const loggedDateThisMonth = habit.frequency === "monthly" ? [...habitDates].find((d) => d.startsWith(monthPrefix)) : undefined;
              return (
                <tr key={habit.id} className="group border-b border-neutral-800/60 last:border-0">
                  <td className="p-3 font-medium text-neutral-200">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: habit.color ?? "#a3a3a3" }}
                      />
                      {habit.name}
                    </span>
                  </td>
                  {habit.frequency === "monthly" ? (
                    <td colSpan={DAYS_TO_SHOW} className="p-2 text-center">
                      <button
                        type="button"
                        disabled={pendingKey === `${habit.id}:${loggedDateThisMonth ?? today}`}
                        onClick={() => handleToggle(habit.id, loggedDateThisMonth ?? today)}
                        className={cn(
                          "mx-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                          loggedDateThisMonth
                            ? "border-transparent bg-emerald-500 text-white"
                            : "border-neutral-700 text-neutral-400 hover:border-neutral-500",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {loggedDateThisMonth ? "Done this month" : "Not done this month"}
                      </button>
                    </td>
                  ) : (
                    days.map((date) => {
                      const scheduled = isScheduledOn(habit, date);
                      const done = habitDates.has(date);
                      const key = `${habit.id}:${date}`;
                      return (
                        <td key={date} className="p-1 text-center">
                          <button
                            type="button"
                            disabled={!scheduled || pendingKey === key}
                            title={scheduled ? undefined : "Not scheduled this day"}
                            onClick={() => handleToggle(habit.id, date)}
                            className={cn(
                              "mx-auto flex h-6 w-6 items-center justify-center rounded-full border transition-colors disabled:opacity-30",
                              done
                                ? "border-transparent bg-emerald-500 text-white"
                                : "border-neutral-700 text-transparent hover:border-neutral-500",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      );
                    })
                  )}
                  <td className="p-3 text-center">
                    {habit.frequency !== "monthly" && streak > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-400">
                        <Flame className="h-3.5 w-3.5" />
                        {streak}
                      </span>
                    )}
                  </td>
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(habit.id, habit.name)}
                      className="-m-1.5 p-1.5 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleHabits.length === 0 && (
              <tr>
                <td colSpan={DAYS_TO_SHOW + 3} className="p-8 text-center text-sm text-neutral-500">
                  {habits.length === 0 ? "No habits yet. Add one above." : "No habits match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
