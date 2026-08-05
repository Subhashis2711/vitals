"use client";

import type { Habit, HabitLog } from "@vitals/shared";
import { Check } from "lucide-react";
import { useState } from "react";
import { toggleHabitLog } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function HabitsTodayMini({ habits, todayLogs }: { habits: Habit[]; todayLogs: HabitLog[] }) {
  const [doneIds, setDoneIds] = useState(() => new Set(todayLogs.map((l) => l.habitId)));
  const [pending, setPending] = useState<string | null>(null);

  async function handleToggle(habitId: string) {
    setPending(habitId);
    try {
      const result = await toggleHabitLog(habitId, todayStr());
      setDoneIds((prev) => {
        const next = new Set(prev);
        if (result.logged) {
          next.add(habitId);
        } else {
          next.delete(habitId);
        }
        return next;
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="space-y-2">
      {habits.slice(0, 6).map((habit) => {
        const done = doneIds.has(habit.id);
        return (
          <li key={habit.id} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 truncate text-sm text-neutral-300">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: habit.color ?? "#a3a3a3" }} />
              <span className="truncate">{habit.name}</span>
            </span>
            <button
              type="button"
              disabled={pending === habit.id}
              onClick={() => handleToggle(habit.id)}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
                done
                  ? "border-transparent bg-emerald-500 text-white"
                  : "border-neutral-700 text-transparent hover:border-emerald-400",
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
      {habits.length === 0 && <li className="text-xs text-neutral-500">No habits yet.</li>}
    </ul>
  );
}
