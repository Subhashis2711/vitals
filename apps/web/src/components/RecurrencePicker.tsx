"use client";

import type { RecurrenceFreq } from "@vitals/shared";
import { cn } from "@/lib/cn";

const FREQ_LABELS: Record<RecurrenceFreq, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // index = Date#getDay(), 0=Sun

export function RecurrencePicker({
  freq,
  daysOfWeek,
  onChange,
}: {
  freq: RecurrenceFreq | null;
  daysOfWeek: number[] | null;
  onChange: (freq: RecurrenceFreq | null, daysOfWeek: number[] | null) => void;
}) {
  function toggleDay(day: number) {
    const current = daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    onChange(freq, next.length > 0 ? next : null);
  }

  return (
    <div className="space-y-1.5">
      <select
        value={freq ?? ""}
        onChange={(e) => {
          const next = (e.target.value || null) as RecurrenceFreq | null;
          onChange(next, next === "weekly" ? daysOfWeek : null);
        }}
        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
      >
        <option value="">Never</option>
        {(Object.keys(FREQ_LABELS) as RecurrenceFreq[]).map((f) => (
          <option key={f} value={f}>
            {FREQ_LABELS[f]}
          </option>
        ))}
      </select>

      {freq === "weekly" && (
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
                  ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {freq === "weekly" && !daysOfWeek?.length && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-600">Pick specific days, or leave blank to repeat every 7 days.</p>
      )}
    </div>
  );
}
