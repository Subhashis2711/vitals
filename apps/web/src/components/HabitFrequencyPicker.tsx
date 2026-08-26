"use client";

import type { HabitFrequency } from "@vitals/shared";
import { cn } from "@/lib/cn";

const FREQ_LABELS: Record<HabitFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // index = Date#getDay(), 0=Sun

export function HabitFrequencyPicker({
  frequency,
  daysOfWeek,
  onChange,
}: {
  frequency: HabitFrequency;
  daysOfWeek: number[] | null;
  onChange: (frequency: HabitFrequency, daysOfWeek: number[] | null) => void;
}) {
  function toggleDay(day: number) {
    const current = daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    onChange(frequency, next.length > 0 ? next : null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {(Object.keys(FREQ_LABELS) as HabitFrequency[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f, f === "weekly" ? daysOfWeek : null)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              frequency === f
                ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                : "border-neutral-700 text-neutral-400 hover:bg-neutral-800",
            )}
          >
            {FREQ_LABELS[f]}
          </button>
        ))}
      </div>
      {frequency === "weekly" && (
        <div className="flex gap-1">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              title={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium transition-colors",
                (daysOfWeek ?? []).includes(day)
                  ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                  : "border-neutral-700 text-neutral-500 hover:bg-neutral-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {frequency === "weekly" && !daysOfWeek?.length && (
        <p className="text-[11px] text-neutral-600">Pick which days this habit applies to.</p>
      )}
    </div>
  );
}
