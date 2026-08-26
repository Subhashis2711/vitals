"use client";

import type { Goal } from "@vitals/shared";
import { cn } from "@/lib/cn";

export function GoalSelect({
  goals,
  value,
  onChange,
  className,
  placeholder = "No goal",
}: {
  goals: Goal[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-300 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {goals.map((goal) => (
        <option key={goal.id} value={goal.id}>
          {goal.title}
        </option>
      ))}
    </select>
  );
}
