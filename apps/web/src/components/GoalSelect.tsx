"use client";

import type { Goal } from "@vitals/shared";
import { cn } from "@/lib/cn";
import { fieldSelectClass } from "@/lib/fieldStyles";

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
      className={cn(fieldSelectClass, className)}
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
